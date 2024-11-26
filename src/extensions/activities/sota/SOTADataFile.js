/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'
import { locationToGrid6 } from '@ham2k/lib-maidenhead-grid'

import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fetchAndProcessBatchedLines } from '../../../store/dataFiles/actions/dataFileFS'

export const SOTAData = {}

export function registerSOTADataFile () {
  registerDataFile({
    key: 'sota-all-summits',
    name: 'SOTA: All Summits',
    description: 'Database of all SOTA references',
    infoURL: 'https://www.sotadata.org.uk/en/summits',
    icon: 'file-image-outline',
    maxAgeInDays: 100,
    enabledByDefault: false,
    fetch: async (args) => {
      const { key, definition, options } = args

      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://www.sotadata.org.uk/summitslist.csv'

      const db = await database()
      db.transaction(transaction => {
        transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['sota'])
      })

      const dataRows = []

      // Since we're streaming, we cannot know how many references there are beforehand, so we need to take a guess
      const expectedSumits = 155000

      // Since the work is split in two phases, and their speeds are different,
      // we need to adjust the expected steps based on a ratio.
      // The ratio comes from the time in seconds it takes to complete each phase in an emulator
      const fetchWorkRatio = 1
      const dbWorkRatio = 2
      const expectedSteps = expectedSumits * (fetchWorkRatio + dbWorkRatio)

      let completedSteps = 0
      let totalSummits = 0
      const startTime = Date.now()

      let version
      let headers

      const { etag } = await fetchAndProcessBatchedLines({
        ...args,
        url,
        chunkSize: 524288,
        processLineBatch: (lines) => {
          if (!version) {
            version = lines.shift()
          }
          if (!headers) {
            headers = parseSOTACSVRow(lines.shift()).filter(x => x)
          }

          for (const line of lines) {
            const row = parseSOTACSVRow(line, { headers })
            if (row.SummitCode && row.ValidTo === '31/12/2099') {
              const lon = Number.parseFloat(row.Longitude) || 0
              const lat = Number.parseFloat(row.Latitude) || 0
              const rowData = {
                ref: row.SummitCode.toUpperCase(),
                grid: locationToGrid6(lat, lon),
                altitude: Number.parseInt(row.AltM, 10),
                region: row.RegionName,
                association: row.AssociationName,
                lat,
                lon
              }
              if (rowData.ref !== row.SummitName) rowData.name = row.SummitName

              dataRows.push(rowData)
              completedSteps += fetchWorkRatio
            }
          }

          options.onStatus && options.onStatus({
            key,
            definition,
            status: 'progress',
            progress: `Loaded \`${fmtNumber(Math.round(completedSteps / (fetchWorkRatio + dbWorkRatio)))}\` references.\n\n\`${fmtPercent(Math.min(completedSteps / expectedSteps, 1), 'integer')}\` • ${fmtNumber(Math.max(expectedSteps - completedSteps, 1) * ((Date.now() - startTime) / 1000) / completedSteps, 'oneDecimal')} seconds left.`
          })
        }
      })

      while (dataRows.length > 0) {
        const batch = dataRows.splice(0, 1571) // prime number chunks make for more "random" progress updates
        await (() => new Promise(resolve => {
          setTimeout(() => {
            db.transaction(async transaction => {
              transaction.executeSql(`
                  DELETE FROM lookups WHERE category = ? AND key IN ?
                `,
              ['pota', batch.map(rowData => rowData.ref)]
              )
              transaction.executeSql(`
                  INSERT INTO lookups
                    (category, subCategory, key, name, data, lat, lon, flags, updated)
                  VALUES
                    ${batch.map(rowData => '(?, ?, ?, ?, ?, ?, ?, ?, 1)').join(' ')}
                `,
              batch.flatMap(rowData => ['pota', `${rowData.dxccCode}`, rowData.ref, rowData.name, JSON.stringify(rowData), rowData.lat, rowData.lon, rowData.active])
              )
              completedSteps += dbWorkRatio * batch.length
              totalSummits += batch.length

              options.onStatus && options.onStatus({
                key,
                definition,
                status: 'progress',
                progress: `Loaded \`${fmtNumber(Math.round(completedSteps / (fetchWorkRatio + dbWorkRatio)))}\` references.\n\n\`${fmtPercent(Math.min(completedSteps / expectedSteps, 1), 'integer')}\` • ${fmtNumber(Math.max(expectedSteps - completedSteps, 1) * ((Date.now() - startTime) / 1000) / completedSteps, 'oneDecimal')} seconds left.`
              })
              resolve()
            })
          }, 0)
        }))()
      }

      db.transaction(transaction => {
        transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['sota'])
      })
      console.log('totalSummits', totalSummits)
      console.log('seconds', (Date.now() - startTime) / 1000)
      console.log('per second', (totalSummits / (Date.now() - startTime) / 1000))

      return { totalSummits, version, etag }
    },

    onLoad: (data) => {
      if (data.regions) return false // Old data - TODO: Remove this after a few months

      SOTAData.totalSummits = data.totalSummits
      SOTAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['sota'])
    }
  })
}

export async function sotaFindOneByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['sota', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function sotaFindAllByName (dxccCode, name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['sota', `%${name}%`, `%${name}%`],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}

export async function sotaFindAllByLocation (dxccCode, lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['sota', lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}

const CSV_ROW_REGEX = /(?:"((?:[^"]|"")*)"|([^",]*))(?:,|\s*$)/g
// (?:              # Start of non-capturing group for each column
//   "((?:[^"]|"")*)" #   Match a quoted string, capturing the contents
//   |              #   Or
//   ([^",]*)         #   Match an unquoted string
// )                # End of non-capturing group for each column
// (?:,|\s*$)       # Match either a comma or the end of the line

function parseSOTACSVRow (row, options) {
  const parts = [...row.matchAll(CSV_ROW_REGEX)].map(match => match[1]?.replaceAll('""', '"') ?? match[2] ?? '')

  if (options?.headers) {
    const obj = {}
    options.headers.forEach((column, index) => {
      obj[column] = parts[index]
    })
    return obj
  } else {
    return parts
  }
}
