import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useStates } from '../api/hooks'
import type { CustomerFormModel } from '../api/types'
import AttributeInputs, { type AttributeValues } from './AttributeInputs'
import { Field } from './ui'

type TextKey = 'firstName' | 'lastName' | 'company' | 'streetAddress' | 'streetAddress2' | 'zipPostalCode' | 'city' | 'county' | 'phone' | 'fax' | 'vatNumber'

interface Props<T extends CustomerFormModel> {
  value: T
  onChange: (value: T) => void
  attributes: AttributeValues
  onAttributesChange: (values: AttributeValues) => void
  /** the email/username fields are rendered by the page */
  children?: React.ReactNode
}

/** Initial values of the GDPR consents (keys "consent{id}", see API.md) */
export function initialConsents(model: CustomerFormModel): AttributeValues {
  return Object.fromEntries(model.gdprConsents.filter(c => c.accepted).map(c => [`consent${c.id}`, 'on']))
}

export function UsernameCheck({ username }: { username: string | null }) {
  const check = useQuery({
    queryKey: ['check-username', username],
    queryFn: () => api.get<{ available: boolean; text: string }>('/account/check-username', { username }),
    enabled: !!username && username.length > 1,
  })
  if (!check.data) return null
  return <span className={check.data.available ? 'success-text' : 'error'}>{check.data.text}</span>
}

/** Personal data form of the registration and the customer info page, driven by the enabled/required flags. */
export default function CustomerFields<T extends CustomerFormModel>({ value, onChange, attributes, onAttributesChange, children }: Props<T>) {
  const states = useStates(value.countryEnabled && value.stateProvinceEnabled ? value.countryId : null)
  const set = (patch: Partial<CustomerFormModel>) => onChange({ ...value, ...patch })
  const text = (key: TextKey, label: string, required = false, type = 'text') => (
    <Field label={label} required={required}>
      <input type={type} required={required} value={value[key] ?? ''} onChange={e => set({ [key]: e.target.value })} />
    </Field>
  )
  const birthday =
    value.dateOfBirthYear && value.dateOfBirthMonth && value.dateOfBirthDay
      ? `${value.dateOfBirthYear}-${String(value.dateOfBirthMonth).padStart(2, '0')}-${String(value.dateOfBirthDay).padStart(2, '0')}`
      : ''

  return (
    <>
      <fieldset>
        <legend>Persönliche Daten</legend>
        <div className="form-grid">
          {value.genderEnabled && (
            <Field label="Anrede">
              <div className="row">
                <label className="option"><input type="radio" checked={value.gender === 'M'} onChange={() => set({ gender: 'M' })} /> Herr</label>
                <label className="option"><input type="radio" checked={value.gender === 'F'} onChange={() => set({ gender: 'F' })} /> Frau</label>
                {value.neutralGenderEnabled && <label className="option"><input type="radio" checked={value.gender === 'N'} onChange={() => set({ gender: 'N' })} /> Divers</label>}
              </div>
            </Field>
          )}
          {value.firstNameEnabled && text('firstName', 'Vorname', value.firstNameRequired)}
          {value.lastNameEnabled && text('lastName', 'Nachname', value.lastNameRequired)}
          {value.dateOfBirthEnabled && (
            <Field label="Geburtsdatum" required={value.dateOfBirthRequired}>
              <input
                type="date"
                value={birthday}
                onChange={e => {
                  const [y, m, d] = e.target.value ? e.target.value.split('-').map(Number) : [null, null, null]
                  set({ dateOfBirthYear: y, dateOfBirthMonth: m, dateOfBirthDay: d })
                }}
              />
            </Field>
          )}
          {children}
        </div>
      </fieldset>

      {(value.companyEnabled || value.displayVatNumber) && (
        <fieldset>
          <legend>Firma</legend>
          <div className="form-grid">
            {value.companyEnabled && text('company', 'Firma', value.companyRequired)}
            {value.displayVatNumber && text('vatNumber', 'USt-IdNr.')}
          </div>
        </fieldset>
      )}

      {(value.streetAddressEnabled || value.cityEnabled || value.countryEnabled || value.phoneEnabled) && (
        <fieldset>
          <legend>Adresse & Kontakt</legend>
          <div className="form-grid">
            {value.streetAddressEnabled && text('streetAddress', 'Straße', value.streetAddressRequired)}
            {value.streetAddress2Enabled && text('streetAddress2', 'Adresszusatz', value.streetAddress2Required)}
            {value.zipPostalCodeEnabled && text('zipPostalCode', 'PLZ', value.zipPostalCodeRequired)}
            {value.cityEnabled && text('city', 'Stadt', value.cityRequired)}
            {value.countyEnabled && text('county', 'Landkreis', value.countyRequired)}
            {value.countryEnabled && (
              <Field label="Land" required={value.countryRequired}>
                <select value={value.countryId || ''} onChange={e => set({ countryId: +e.target.value, stateProvinceId: 0 })}>
                  {value.availableCountries.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                </select>
              </Field>
            )}
            {value.countryEnabled && value.stateProvinceEnabled && (
              <Field label="Bundesland" required={value.stateProvinceRequired}>
                <select value={value.stateProvinceId || 0} onChange={e => set({ stateProvinceId: +e.target.value })}>
                  {(states.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            )}
            {value.phoneEnabled && text('phone', 'Telefon', value.phoneRequired, 'tel')}
            {value.faxEnabled && text('fax', 'Fax', value.faxRequired, 'tel')}
          </div>
        </fieldset>
      )}

      {(value.newsletterEnabled || value.newsLetterSubscriptions?.length || value.allowCustomersToSetTimeZone) && (
        <fieldset>
          <legend>Optionen</legend>
          {value.newsLetterSubscriptions?.map((n, i) => (
            <label key={n.typeId} className="option">
              <input
                type="checkbox"
                checked={n.isActive}
                onChange={e => set({ newsLetterSubscriptions: value.newsLetterSubscriptions!.map((x, j) => (i === j ? { ...x, isActive: e.target.checked } : x)) })}
              />{' '}
              {n.name}
            </label>
          ))}
          {value.allowCustomersToSetTimeZone && (
            <Field label="Zeitzone">
              <select value={value.timeZoneId ?? ''} onChange={e => set({ timeZoneId: e.target.value })}>
                {value.availableTimeZones.map(t => <option key={t.value} value={t.value}>{t.text}</option>)}
              </select>
            </Field>
          )}
        </fieldset>
      )}

      {value.customerAttributes.length > 0 && (
        <fieldset>
          <legend>Weitere Angaben</legend>
          <AttributeInputs attributes={value.customerAttributes} prefix="customer_attribute_" values={attributes} onChange={onAttributesChange} />
        </fieldset>
      )}

      {value.gdprConsents.length > 0 && (
        <fieldset>
          <legend>Einwilligungen</legend>
          {value.gdprConsents.map(c => (
            <label key={c.id} className="option">
              <input
                type="checkbox"
                checked={attributes[`consent${c.id}`] === 'on'}
                onChange={e => {
                  const next = { ...attributes }
                  if (e.target.checked) next[`consent${c.id}`] = 'on'
                  else delete next[`consent${c.id}`]
                  onAttributesChange(next)
                }}
              />{' '}
              {c.message}
              {c.isRequired && <span className="required">*</span>}
            </label>
          ))}
        </fieldset>
      )}
    </>
  )
}
