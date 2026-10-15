import { useCountries, useStates } from '../api/hooks'
import type { AddressModel } from '../api/types'
import AttributeInputs, { type AttributeValues } from './AttributeInputs'
import { Field } from './ui'

interface Props {
  value: AddressModel
  onChange: (address: AddressModel) => void
  attributes?: AttributeValues
  onAttributesChange?: (values: AttributeValues) => void
  /** CountryAddressType for the country list if the model doesn't contain countries: 10 billing, 20 shipping */
  countryType?: number
}

type TextKey = 'firstName' | 'lastName' | 'email' | 'company' | 'county' | 'city' | 'address1' | 'address2' | 'zipPostalCode' | 'phoneNumber' | 'faxNumber'

/** Address form driven by the enabled/required flags of the nopCommerce AddressModel. */
export default function AddressForm({ value, onChange, attributes, onAttributesChange, countryType = 0 }: Props) {
  const countries = useCountries(countryType)
  const states = useStates(value.stateProvinceEnabled ? value.countryId : null)

  const set = (patch: Partial<AddressModel>) => onChange({ ...value, ...patch })
  const text = (key: TextKey, label: string, required = false, type = 'text') => (
    <Field label={label} required={required}>
      <input type={type} value={value[key] ?? ''} required={required} onChange={e => set({ [key]: e.target.value })} />
    </Field>
  )

  const countryOptions = value.availableCountries?.length
    ? value.availableCountries.filter(c => c.value !== '0').map(c => ({ id: c.value, name: c.text }))
    : (countries.data ?? []).map(c => ({ id: String(c.id), name: c.name }))

  return (
    <div className="form-grid">
      {text('firstName', 'Vorname', true)}
      {text('lastName', 'Nachname', true)}
      {text('email', 'E-Mail', true, 'email')}
      {value.companyEnabled && text('company', 'Firma', value.companyRequired)}
      {value.countryEnabled && (
        <Field label="Land" required>
          <select value={value.countryId ?? ''} required onChange={e => set({ countryId: e.target.value ? +e.target.value : null, stateProvinceId: null })}>
            <option value="">Land wählen</option>
            {countryOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      {value.countryEnabled && value.stateProvinceEnabled && (
        <Field label="Bundesland / Region">
          <select value={value.stateProvinceId ?? 0} onChange={e => set({ stateProvinceId: +e.target.value })}>
            {(states.data ?? [{ id: 0, name: '---' }]).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}
      {value.countyEnabled && text('county', 'Landkreis', value.countyRequired)}
      {value.cityEnabled && text('city', 'Stadt', value.cityRequired)}
      {value.streetAddressEnabled && text('address1', 'Straße und Hausnummer', value.streetAddressRequired)}
      {value.streetAddress2Enabled && text('address2', 'Adresszusatz', value.streetAddress2Required)}
      {value.zipPostalCodeEnabled && text('zipPostalCode', 'PLZ', value.zipPostalCodeRequired)}
      {value.phoneEnabled && text('phoneNumber', 'Telefon', value.phoneRequired, 'tel')}
      {value.faxEnabled && text('faxNumber', 'Fax', value.faxRequired, 'tel')}
      {onAttributesChange && (
        <div className="span-all">
          <AttributeInputs attributes={value.customAddressAttributes} prefix="address_attribute_" values={attributes ?? {}} onChange={onAttributesChange} />
        </div>
      )}
    </div>
  )
}

/** One-line summary of an address */
export function addressSummary(a: AddressModel) {
  return [
    [a.firstName, a.lastName].filter(Boolean).join(' '),
    a.company,
    a.address1,
    a.address2,
    [a.zipPostalCode, a.city].filter(Boolean).join(' '),
    a.stateProvinceName,
    a.countryName,
  ]
    .filter(Boolean)
    .join(', ')
}

export function AddressBlock({ address, title }: { address?: AddressModel | null; title?: string }) {
  if (!address) return null
  return (
    <div className="address">
      {title && <h4>{title}</h4>}
      <div>{[address.firstName, address.lastName].filter(Boolean).join(' ')}</div>
      {address.company && <div>{address.company}</div>}
      {address.address1 && <div>{address.address1}</div>}
      {address.address2 && <div>{address.address2}</div>}
      <div>{[address.zipPostalCode, address.city].filter(Boolean).join(' ')}</div>
      {address.stateProvinceName && <div>{address.stateProvinceName}</div>}
      {address.countryName && <div>{address.countryName}</div>}
      {address.email && <div className="muted">{address.email}</div>}
      {address.phoneNumber && <div className="muted">Tel. {address.phoneNumber}</div>}
      {address.formattedCustomAddressAttributes && <div className="small" dangerouslySetInnerHTML={{ __html: address.formattedCustomAddressAttributes }} />}
    </div>
  )
}
