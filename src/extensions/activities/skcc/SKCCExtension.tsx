import React, { useEffect, useRef, useState } from 'react'
import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { Extension as RegistryExtension } from '../../registry'
import { Info } from './SKCCInfo'
import { AppDispatch } from '../../../store'
import { registerSKCCMembershipData } from './SKCCMembershipData'
import { findRef } from '../../../tools/refTools'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'
import { Ham2kDialog } from '../../../screens/components/Ham2kDialog'
import { Button, Dialog, Text } from 'react-native-paper'
import { useDebounce } from '../../../hooks/useDebounce'
import { dbExecute } from '../../../store/db/db'

interface SKCCRow {
  call: string
  skccNr: string
  spc: string
  name: string
  skcc: string
}

const Extension: RegistryExtension = {
  ...Info,
  category: 'other',
  enabledByDefault: false,
  alwaysEnabled: false,
  onActivationDispatch: ({ registerHook }) => async (dispatch: AppDispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })
    registerSKCCMembershipData()

    await dispatch(loadDataFile('skcc-membership', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch: AppDispatch) => {
    await dispatch(removeDataFile('skcc-membership'))
  }
}

export default Extension

const ReferenceHandler = {
  ...Info,

  suggestOperationTitle: () => {
    return { title: 'Straight Key Century Club' }
  }
}

const ActivityHook = {
  ...Info,
  mainExchangeForQSO: MainExchangeForQSO
}

function MainExchangeForQSO ({ qso, operation, themeColor, updateQSO, handleFieldChange }:
  {
    qso: any,
    operation: any,
    themeColor: any,
    updateQSO: (qso: any) => void,
    handleFieldChange: (event: { fieldId: string, value: any, alsoClearTheirCall?: boolean }) => void
  }
) {
  const debouncedQso = useDebounce(qso)
  const call: string = debouncedQso?.their?.call
  const skcc: string = debouncedQso?.their?.skcc
  const [proposedGuess, setProposedGuess] = useState<SKCCRow | undefined>()
  const confirmedGuess = useRef<SKCCRow | undefined>()

  useEffect(() => {
    if (!(call && call !== '') && !(skcc && skcc !== '')) {
      return
    }

    if (call === confirmedGuess?.current?.call && skcc === confirmedGuess?.current?.skccNr) {
      return
    }

    async function fetch () {
      const result = call && call !== confirmedGuess?.current?.call
        ? await dbExecute('SELECT * FROM skccMembers WHERE call = ?', [call])
        : await dbExecute('SELECT * FROM skccMembers WHERE skcc = ?', [skcc])
      if (!ignore) {
        if (result.rows.length === 1) {
          const row: SKCCRow = result.rows.item(0)
          setProposedGuess(row)
        }
      }
    }

    let ignore = false
    fetch()
    return () => {
      ignore = true
    }
  }, [call, skcc, confirmedGuess, setProposedGuess])

  const handleLeaveAsIs = () => {
    setProposedGuess(undefined)
  }
  const handleClearFields = () => {
    confirmedGuess.current = undefined
    setProposedGuess(undefined)
    updateQSO({ their: { call: undefined, name: undefined, skcc: undefined, state: undefined, comment: undefined } })
  }
  const handleOverwriteFields = () => {
    confirmedGuess.current = proposedGuess
    setProposedGuess(undefined)
    const comment = `SKCC: ${proposedGuess?.skccNr} - ${proposedGuess?.name} - ${proposedGuess?.spc}`
    updateQSO({ their: { call: proposedGuess?.call, name: proposedGuess?.name, skcc: proposedGuess?.skccNr, state: proposedGuess?.spc }, comment })
  }

  const fields = proposedGuess ? [
    <ConfirmClearSKCCFieldsDialog
      key="skcc-clear-dialog"
      newFields={proposedGuess}
      onClear={handleClearFields}
      onLeaveAsIs={handleLeaveAsIs}
      onOverwrite={handleOverwriteFields}
    />
  ] : []
  if (findRef(operation, Info.activationType)) {
    fields.push(
      <ThemedTextInput
        key="skcc"
        label="SKCC"
        themeColor={themeColor}
        value={qso?.their?.skcc ?? ''}
        placeholder={qso?.their?.skcc ?? ''}
        uppercase={true}
        noSpaces={true}
        fieldId={'skcc'}
        onChange={handleFieldChange}
      />
    )
    fields.push(
      <ThemedTextInput
        key="name"
        label="Name"
        themeColor={themeColor}
        value={qso?.their?.name ?? ''}
        placeholder={qso?.their?.name ?? ''}
        uppercase={false}
        noSpaces={false}
        fieldId={'name'}
        onChange={handleFieldChange}
      />
    )
  }

  return fields
}

function ConfirmClearSKCCFieldsDialog ({ newFields, onLeaveAsIs, onOverwrite, onClear }: {
  newFields: SKCCRow,
  onLeaveAsIs: () => void,
  onOverwrite: () => void,
  onClear: () => void,
}) {
  return (
    <Ham2kDialog visible={true} onDismiss={onLeaveAsIs}>
      <Dialog.Title style={{ textAlign: 'center' }}>Overwrite SKCC Fields</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Updating SKCC fields may overwrite already entered data for this QSOs</Text>
      </Dialog.Content>
      <Dialog.Content>
        <Text variant="bodyMedium" style={{ textAlign: 'center' }}>{`SKCC: ${newFields.skccNr}, Name: ${newFields.name}, SPC: ${newFields.spc}`}</Text>
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: 'space-between' }}>
        <Button onPress={onOverwrite}>Overwrite Fields</Button>
        <Button onPress={onClear}>Clear Fields</Button>
        <Button onPress={onLeaveAsIs}>Leave As Is</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
