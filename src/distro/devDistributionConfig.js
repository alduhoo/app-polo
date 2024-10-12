/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect } from 'react'
import { hashCode } from '../tools/hashCode'
import packageJson from '../../package.json'
import { addRuntimeMessage } from '../store/runtime'

export function reportError (error, ...extra) {
  console.error(error, ...extra)
  if (extra && extra[0]?.stack) console.error(extra[0].stack)
}

export function reportData (payload) {
  payload.version = packageJson.version
  // console.info('DATA', payload)
}

export function trackSettings ({ settings, action, actionData }) {
  if (settings.consentAppData) {
    reportData({ call: settings.operatorCall, settings: { ...settings, accounts: undefined }, action, actionData })
  } else {
    reportData({
      call: `ANON-${hashCode(settings.operatorCall)}`,
      settings: { consentAppData: settings.consentAppData, consentOpData: settings.consentOpData }
    })
  }
}

export function trackOperation ({ operation, settings, action, actionData }) {
  if (settings.consentAppData) {
    reportData({ call: settings.operatorCall, operation: { ...operation, consentOpData: settings.consentOpData }, action, actionData })
  }
}

export function trackNavigation () {
  // Do nothing
}

export function trackEvent () {
  // Do nothing
}

export function AppWrappedForDistribution ({ children }) {
  return (
    <>
      {children}
    </>
  )
}

export function useConfigForDistribution ({ settings }) {
  // Do nothing
}

export function startupStepsForDistribution ({ settings, dispatch }) {
  return [
    async () => {
      await dispatch(addRuntimeMessage('Portable Logger Development Build'))
    }
  ]
}

export function handleNoticeActionForDistribution ({ notice, dispatch, setOverlayText }) {
  return true
}

export function enableStartupInterruptionDialogForDistribution ({ settings }) {
  return false
}

export function StartupInterruptionDialogForDistribution ({ settings, styles, setStartupPhase }) {
  useEffect(() => setStartupPhase('start'), [setStartupPhase])
  return (
    <></>
  )
}

export function DevModeSettingsForDistribution ({ settings, styles, dispatch, operations }) {
  return (
    <></>
  )
}
