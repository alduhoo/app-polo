/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import { reportError } from '../distro'

import { selectSettings } from '../store/settings'
import { AppDispatch, GetState } from '../store'

/*
 * # Extensions Registry
 * An extension is a module that can be registered to the application to extend its functionality.
 *
 * It can be enabled or disabled at runtime based on defaults and user preferences.
 *
 * It can register `hooks` to be called at specific points in the application lifecycle.
 *
 */
type ExtensionCategory = 'commands' | 'core' | 'data' | 'detail' | 'fieldOps' | 'locationBased' | 'other'
type HookCategory = 'activity' | 'command' | 'screen' | 'setting' | 'opSetting' | `ref:${string}`
export interface Extension {
  key: string,
  category: ExtensionCategory,
  alwaysEnabled: boolean,
  enabledByDefault: boolean,
  priority?: number,
  onActivation?: (obj: { registerHook: (hookCategory: HookCategory, props: any) => void}) => void,
  onActivationDispatch?: (obj: { registerHook: (hookCategory: HookCategory, props: any) => void}) => (dispatch: AppDispatch) => Promise<void>
  onDeactivation?: (_: {}) => void,
  onDeactivationDispatch?: (_: {}) => (dispatch: AppDispatch) => Promise<void>
}

interface Hook {
  key: string,
  hook: any,
  priority?: number,
  extension?: Extension,
}

const Extensions: {
  [index: string]: Extension;
} = {
}

const Hooks: Record<HookCategory, Hook[]> = {
  activity: [],
  command: [],
  screen: [],
  setting: [],
  opSetting: []
}

const VALID_HOOK_REGEX = /^(ref:\w+)/

export function registerExtension (extension: Extension) {
  Extensions[extension.key] = extension
}

export function getExtension (key: string) {
  return Extensions[key]
}

export function allExtensions () {
  return Object.values(Extensions)
}

function isExtensionEnabled (extension: Extension, settings: any): boolean {
  return (extension.alwaysEnabled || (settings[`extensions/${extension.key}`] ?? extension.enabledByDefault))
}

export function findHooks (hookCategory: HookCategory, { key }: { key?: string } = {}) {
  let hooks = (Hooks[hookCategory] ?? []).map(h => h.hook)
  if (key) hooks = hooks.filter(h => h.key === key)

  return hooks
}

export function useFindHooks (hookCategory: HookCategory, { key }: { key?: string } = {}) {
  const settings = useSelector(selectSettings)

  const activeExtensionHash = useMemo(() => {
    const extensions = allExtensions()
    return extensions.filter(extension => isExtensionEnabled(extension, settings)).join('|')
  }, [settings])

  return useMemo(() => findHooks(hookCategory, { key }), [activeExtensionHash, hookCategory, key]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function findBestHook (hookCategory: HookCategory, options: { key?: string }) {
  return findHooks(hookCategory, options)[0]
}

function registerHook (hookCategory: HookCategory, { extension, hook, priority }: { extension: Extension, hook: Hook, priority: number }) {
  if (!Hooks[hookCategory] && !VALID_HOOK_REGEX.test(hookCategory)) {
    reportError(`Invalid hook ${hookCategory} for extension ${extension.key}`)
    return false
  }

  if (!hook) hook = extension[hookCategory]
  if (!extension) extension = hook.extension

  const newHooks = (Hooks[hookCategory] ?? []).filter(h => h.key !== (hook.key ?? extension.key))
  newHooks.push({ key: hook.key ?? extension.key, extension, hook, priority })
  newHooks.sort((a, b) => (b.priority ?? b.extension?.priority ?? 0) - (a.priority ?? a.extension?.priority ?? 0))
  Hooks[hookCategory] = newHooks
}

function unregisterAllHooks (hookCategory: HookCategory, { extension }: { extension: Extension }) {
  Hooks[hookCategory] = Hooks[hookCategory].filter(h => h.key !== extension.key)
}

export async function activateEnabledExtensions (dispatch: AppDispatch, getState: GetState) {
  const settings = selectSettings(getState()) || {}
  const extensions = allExtensions()
  for (const extension of extensions) {
    if (isExtensionEnabled(extension, settings)) {
      await dispatch(activateExtension(extension))
    }
  }
}

export const activateExtension = (extension: Extension) => async (dispatch: AppDispatch) => {
  if (extension.onActivation) {
    extension.onActivation({
      registerHook: (hookCategory, props) => { registerHook(hookCategory, { ...props, extension }) }
    })
  }
  if (extension.onActivationDispatch) {
    await dispatch(extension.onActivationDispatch({
      registerHook: (hookCategory, props) => { registerHook(hookCategory, { ...props, extension }) }
    }))
  }
}

export const deactivateExtension = (extension: Extension) => async (dispatch: AppDispatch) => {
  if (extension.onDeactivation) {
    extension.onDeactivation({})
  }
  if (extension.onDeactivationDispatch) {
    await dispatch(extension.onDeactivationDispatch({}))
  }
  Object.keys(Hooks).forEach(hookCategory => {
    unregisterAllHooks(hookCategory, { extension })
  })
}
