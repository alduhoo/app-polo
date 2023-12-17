import packageJson from '../../package.json'
import { fmtADIFDate, fmtADIFTime } from './timeFormats'

export function qsonToADIF ({ operation, qsos }) {
  const commonRefs = []
  if (operation.pota) {
    (operation?.pota ?? '').split(',').forEach(ref => {
      ref = ref.trim()
      commonRefs.push({ type: 'potaActivation', ref })
    })
  }

  let str = ''

  str += 'ADIF for Operation \n'
  str += adifField('ADIF_VER', '3.1.4', { newLine: true })
  str += adifField('PROGRAMID', 'Ham2K Portable Logger', { newLine: true })
  str += adifField('PROGRAMVERSION', packageJson.version, { newLine: true })
  str += '<EOH>\n'

  qsos.forEach(qso => {
    str += oneQSOtoADIFWithPOTAMultiples(qso, commonRefs)
  })

  return str
}

// When a QSO has multiple POTA refs (either activatiors or hunters) we need to generate
// one ADIF QSO for each combination, and fudge the time by one second for each one
function oneQSOtoADIFWithPOTAMultiples (qso, commonRefs) {
  const potaActivationRefs = (commonRefs || []).filter(ref => ref.type === 'potaActivation')
  const potaRefs = (qso?.refs || []).filter(ref => ref.type === 'pota')
  let str = ''

  console.log('potaActivationRefs', potaActivationRefs)
  console.log('potaRefs', potaRefs)
  if (potaActivationRefs.length === 0) {
    if (potaRefs.length === 0) {
      str += oneQSOtoADIF(qso)
    } else {
      potaRefs.forEach((potaRef, i) => {
        str += oneQSOtoADIF(qso, { pota: potaRef.ref }, i * 1000)
      })
    }
  } else {
    potaActivationRefs.forEach((activationRef, i) => {
      if (potaRefs.length === 0) {
        str += oneQSOtoADIF(qso, { potaActivation: activationRef.ref }, i * 1000)
      } else {
        potaRefs.forEach((potaRef, j) => {
          str += oneQSOtoADIF(qso, { potaActivation: activationRef.ref, pota: potaRef.ref }, ((i * potaRefs.length) + j) * 1000)
        })
      }
    })
  }
  return str
}

function oneQSOtoADIF (qso, potaRefs = {}, timeOfffset = 0) {
  console.log('qso', qso.their.call, potaRefs, timeOfffset)
  let str = ''
  str += adifField('CALL', qso.their.call)
  if (qso.band) str += adifField('BAND', qso.band)
  str += adifField('MODE', qso.mode ?? 'SSB')
  str += adifField('QSO_DATE', fmtADIFDate(qso.startOnMillis + timeOfffset))
  str += adifField('TIME_ON', fmtADIFTime(qso.startOnMillis + timeOfffset))
  str += adifField('FREQ', qso.freq)
  str += adifField('RST_RCVD', qso.their.sent)
  str += adifField('RST_SENT', qso.our.sent)
  str += adifField('OPERATOR', qso.our.call)
  str += adifField('NOTES', qso.our.notes)

  if (potaRefs.activationRef) {
    str += adifField('MY_SIG', 'POTA')
    str += adifField('MY_SIG_INFO', potaRefs.activationRef)
  }

  if (potaRefs.potaRef) {
    str += adifField('SIG', 'POTA')
    str += adifField('SIG_INFO', potaRefs.potaRef)
  }

  str += '<EOR>\n'
  return str
}

function adifField (name, value, options = {}) {
  return `<${name}:${value?.length ?? 0}>${value ?? ''}${options.newLine ? '\n' : ' '}`
}
