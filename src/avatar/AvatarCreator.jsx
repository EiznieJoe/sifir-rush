import { Avatar3D } from './Avatar.jsx'
import { SKINS, HAIR_COLORS, OUTFITS, HAIR_STYLES, EYE_STYLES, HATS, randomAvatar } from './config.js'

function Swatches({ label, colors, value, onPick }) {
  return (
    <div className="opt-row">
      <span className="opt-label">{label}</span>
      <div className="swatches">
        {colors.map((c, i) => (
          <button
            key={c}
            type="button"
            className={`swatch ${value === i ? 'on' : ''}`}
            style={{ background: c }}
            onClick={() => onPick(i)}
            aria-label={`${label} ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

function Chips({ label, items, value, onPick }) {
  return (
    <div className="opt-row">
      <span className="opt-label">{label}</span>
      <div className="chips">
        {items.map((name, i) => (
          <button key={name} type="button" className={`chip ${value === i ? 'on' : ''}`} onClick={() => onPick(i)}>
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AvatarCreator({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  return (
    <div className="creator">
      <div className="creator-preview">
        <Avatar3D config={value} sway />
        <button type="button" className="btn small secondary random" onClick={() => onChange(randomAvatar())}>
          Rawak
        </button>
      </div>
      <div className="creator-opts">
        <Swatches label="Kulit" colors={SKINS} value={value.skin} onPick={(i) => set('skin', i)} />
        <Chips label="Rambut" items={HAIR_STYLES} value={value.hairStyle} onPick={(i) => set('hairStyle', i)} />
        <Swatches label="Warna rambut" colors={HAIR_COLORS} value={value.hairColor} onPick={(i) => set('hairColor', i)} />
        <Chips label="Mata" items={EYE_STYLES} value={value.eyes} onPick={(i) => set('eyes', i)} />
        <Chips label="Topi" items={HATS} value={value.hat} onPick={(i) => set('hat', i)} />
        <Swatches label="Baju" colors={OUTFITS} value={value.outfit} onPick={(i) => set('outfit', i)} />
      </div>
    </div>
  )
}
