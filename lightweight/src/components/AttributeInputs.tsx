import { useState } from 'react'
import { storeUrl } from '../api/client'
import { AttributeControlType as T, type AttributeModel } from '../api/types'
import { useToast } from './Toast'

export type AttributeValues = Record<string, string>

/**
 * Initial form values of dynamic attributes (product, checkout, customer, address, vendor attributes),
 * keyed like the storefront form, e.g. "product_attribute_5" (see API.md, "Formularfelder als Wörterbuch").
 */
export function initialAttributeValues(attributes: AttributeModel[] | undefined, prefix: string): AttributeValues {
  const values: AttributeValues = {}
  for (const attr of attributes ?? []) {
    const key = `${prefix}${attr.id}`
    switch (attr.attributeControlType) {
      case T.TextBox:
      case T.MultilineTextbox:
        if (attr.defaultValue) values[key] = attr.defaultValue
        break
      case T.Datepicker:
        if (attr.selectedYear && attr.selectedMonth && attr.selectedDay) {
          values[`${key}_day`] = String(attr.selectedDay)
          values[`${key}_month`] = String(attr.selectedMonth)
          values[`${key}_year`] = String(attr.selectedYear)
        }
        break
      case T.FileUpload:
        if (attr.defaultValue) values[key] = attr.defaultValue
        break
      default: {
        const selected = attr.values.filter(v => v.isPreSelected).map(v => v.id)
        if (selected.length) values[key] = selected.join(',')
        for (const v of attr.values) if (v.customerEntersQty) values[`${key}_${v.id}_qty`] = String(v.quantity || 1)
      }
    }
  }
  return values
}

interface Props {
  attributes: AttributeModel[] | undefined
  prefix: string
  values: AttributeValues
  onChange: (values: AttributeValues) => void
  /** attribute ids whose conditions are not met (hidden) */
  hiddenIds?: number[]
  /** uploads a file for a "file upload" attribute and returns the download GUID */
  onUpload?: (attribute: AttributeModel, file: File) => Promise<string>
}

export default function AttributeInputs({ attributes, prefix, values, onChange, hiddenIds = [], onUpload }: Props) {
  const toast = useToast()
  const [uploading, setUploading] = useState<number | null>(null)
  if (!attributes?.length) return null

  const set = (patch: AttributeValues) => onChange({ ...values, ...patch })

  return (
    <div className="attributes">
      {attributes.filter(a => !hiddenIds.includes(a.id)).map(attr => {
        const key = `${prefix}${attr.id}`
        const value = values[key] ?? ''
        const selectedIds = value ? value.split(',') : []
        const valueLabel = (v: AttributeModel['values'][number]) => (v.priceAdjustment ? `${v.name} [${v.priceAdjustment}]` : v.name)

        let input: React.ReactNode
        switch (attr.attributeControlType) {
          case T.DropdownList:
            input = (
              <select value={value} onChange={e => set({ [key]: e.target.value })}>
                {(!attr.isRequired || !value) && <option value="">---</option>}
                {attr.values.map(v => <option key={v.id} value={v.id}>{valueLabel(v)}</option>)}
              </select>
            )
            break
          case T.RadioList:
          case T.ColorSquares:
          case T.ImageSquares:
            input = (
              <div className={attr.attributeControlType === T.RadioList ? 'options' : 'options squares'}>
                {attr.values.map(v => (
                  <label key={v.id} className={`option ${value === String(v.id) ? 'checked' : ''}`} title={valueLabel(v)}>
                    <input type="radio" name={key} checked={value === String(v.id)} onChange={() => set({ [key]: String(v.id) })} />
                    {attr.attributeControlType === T.ColorSquares && <span className="swatch" style={{ background: v.colorSquaresRgb ?? undefined }} />}
                    {attr.attributeControlType === T.ImageSquares && v.imageSquaresPictureModel?.imageUrl && (
                      <img className="swatch-img" src={storeUrl(v.imageSquaresPictureModel.imageUrl)} alt={v.name} />
                    )}
                    <span>{valueLabel(v)}</span>
                  </label>
                ))}
              </div>
            )
            break
          case T.Checkboxes:
          case T.ReadonlyCheckboxes:
            input = (
              <div className="options">
                {attr.values.map(v => {
                  const checked = selectedIds.includes(String(v.id))
                  return (
                    <label key={v.id} className="option">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={attr.attributeControlType === T.ReadonlyCheckboxes}
                        onChange={() => {
                          const next = checked ? selectedIds.filter(id => id !== String(v.id)) : [...selectedIds, String(v.id)]
                          set({ [key]: next.join(',') })
                        }}
                      />
                      <span>{valueLabel(v)}</span>
                    </label>
                  )
                })}
              </div>
            )
            break
          case T.MultilineTextbox:
            input = <textarea value={value} onChange={e => set({ [key]: e.target.value })} />
            break
          case T.Datepicker: {
            const y = values[`${key}_year`]
            const m = values[`${key}_month`]
            const d = values[`${key}_day`]
            const date = y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : ''
            input = (
              <input
                type="date"
                value={date}
                onChange={e => {
                  const [yy, mm, dd] = e.target.value ? e.target.value.split('-') : ['', '', '']
                  set({ [`${key}_year`]: yy, [`${key}_month`]: mm ? String(+mm) : '', [`${key}_day`]: dd ? String(+dd) : '' })
                }}
              />
            )
            break
          }
          case T.FileUpload:
            input = (
              <div>
                <input
                  type="file"
                  accept={attr.allowedFileExtensions?.map(ext => `.${ext}`).join(',')}
                  disabled={!onUpload || uploading === attr.id}
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (!file || !onUpload) return
                    setUploading(attr.id)
                    try {
                      set({ [key]: await onUpload(attr, file) })
                      toast('Datei hochgeladen')
                    } catch (error) {
                      toast((error as Error).message, 'error')
                    } finally {
                      setUploading(null)
                    }
                  }}
                />
                {value && <span className="small muted"> Download-GUID: {value}</span>}
              </div>
            )
            break
          default:
            input = <input type="text" value={value} onChange={e => set({ [key]: e.target.value })} />
        }

        return (
          <div key={attr.id} className="field">
            <span className="field-label">
              {attr.textPrompt || attr.name}
              {attr.isRequired && <span className="required">*</span>}
            </span>
            {attr.description && <span className="field-hint" dangerouslySetInnerHTML={{ __html: attr.description }} />}
            {input}
            {attr.values
              .filter(v => v.customerEntersQty && selectedIds.includes(String(v.id)))
              .map(v => (
                <label key={v.id} className="small">
                  Menge für {v.name}:{' '}
                  <input type="number" min={1} className="qty" value={values[`${key}_${v.id}_qty`] ?? '1'} onChange={e => set({ [`${key}_${v.id}_qty`]: e.target.value })} />
                </label>
              ))}
          </div>
        )
      })}
    </div>
  )
}
