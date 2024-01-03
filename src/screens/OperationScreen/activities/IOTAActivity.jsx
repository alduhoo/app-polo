/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { setOperationData } from '../../../store/operations'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from '../components/ActivitySettingsDialog'
import { replaceRefs, stringToRefs } from '../../../tools/refTools'

const ACTIVITY = {
  key: 'iota',
  comingSoon: true,
  icon: 'island',
  name: 'Islands on the Air',
  shortName: 'IOTA',
  infoURL: 'https://www.iota-world.org/',
  huntingType: 'iota',
  activationType: 'iotaActivation',
  exchangeShortLabel: 'IOTA',
  operationAttribute: 'iota',
  description: (operation) => 'COMING SOON!',
  descriptionPlaceholder: 'Enter IOTA reference'
}

function ThisActivityExchangePanel (props) {
  return (
    <Text>WIP</Text>
  )
}

export function ThisActivitySettingsDialog (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const handleChange = useCallback((value) => {
    let refs
    if (value) {
      refs = stringToRefs(ACTIVITY.activationType, value, { regex: ACTIVITY.referenceRegex })
    } else {
      refs = []
    }

    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, ACTIVITY.activationType, refs) }))
  }, [dispatch, operation])

  return (
    <ActivitySettingsDialog
      {...props}
      icon={ACTIVITY.icon}
      title={ACTIVITY.name}
      info={ACTIVITY.infoURL}
      removeOption={true}
      value={operation[ACTIVITY.operationAttribute]}
      onChange={handleChange}
      content={({ value, setValue }) => (
        <>
          <Text variant="bodyMedium">Enter the reference for the Island being activated in this operation</Text>
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={styles.nativeInput}
            label={'IOTA Reference'}
            placeholder={'...'}
            mode={'flat'}
            value={value}
            onChangeText={(text) => setValue(text)}
          />
          <Text variant="bodyMedium" style={{ color: styles.theme.colors.primary }}>NOT FUNCTIONAL YET, FOR TESTING PURPOSES ONLY</Text>
        </>
      )}
    />
  )
}

const ThisActivity = {
  ...ACTIVITY,
  ExchangePanel: ThisActivityExchangePanel,
  SettingsDialog: ThisActivitySettingsDialog
}

export default ThisActivity
