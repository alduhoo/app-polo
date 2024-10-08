/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { removeDataFile } from './actions/dataFileFS'

interface DataFileDefinition {
  key: string
  onUnload?: () => void
}

const registeredDataFiles: {
  [index: string]: DataFileDefinition
} = {}

export function registerDataFile (definiton: DataFileDefinition) {
  registeredDataFiles[definiton.key] = definiton
}

export function unRegisterDataFile (definiton: DataFileDefinition) {
  registeredDataFiles[definiton.key]?.onUnload && registeredDataFiles[definiton.key]?.onUnload?.()
  removeDataFile(definiton.key)
  delete registeredDataFiles[definiton.key]
}

export function getDataFileDefinition (key: string) {
  return registeredDataFiles[key]
}

export function getDataFileDefinitions () {
  return Object.values(registeredDataFiles)
}
