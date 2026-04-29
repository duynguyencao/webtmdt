import React, { useEffect, useMemo, useState } from 'react'

const API = 'https://provinces.open-api.vn/api'

const byName = (a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'vi')

export default function VnAddressSelect({ city, district, ward, onChange }) {
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [wards, setWards] = useState([])

  const [provinceCode, setProvinceCode] = useState('')
  const [districtCode, setDistrictCode] = useState('')

  useEffect(() => {
    fetch(`${API}/?depth=1`)
      .then((r) => r.json())
      .then((list) => setProvinces(Array.isArray(list) ? list.sort(byName) : []))
      .catch(() => setProvinces([]))
  }, [])

  const provinceByName = useMemo(() => {
    const map = new Map()
    provinces.forEach((p) => map.set(String(p.name || '').toLowerCase(), p))
    return map
  }, [provinces])

  // Nếu đã có city string từ profile => cố gắng map sang code
  useEffect(() => {
    if (!city || provinceCode) return
    const p = provinceByName.get(String(city).toLowerCase())
    if (p?.code) setProvinceCode(String(p.code))
  }, [city, provinceCode, provinceByName])

  useEffect(() => {
    if (!provinceCode) {
      setDistricts([])
      setWards([])
      setDistrictCode('')
      return
    }
    fetch(`${API}/p/${provinceCode}?depth=2`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.districts) ? data.districts.sort(byName) : []
        setDistricts(list)
      })
      .catch(() => setDistricts([]))
  }, [provinceCode])

  const districtByName = useMemo(() => {
    const map = new Map()
    districts.forEach((d) => map.set(String(d.name || '').toLowerCase(), d))
    return map
  }, [districts])

  useEffect(() => {
    if (!district || districtCode) return
    const d = districtByName.get(String(district).toLowerCase())
    if (d?.code) setDistrictCode(String(d.code))
  }, [district, districtCode, districtByName])

  useEffect(() => {
    if (!districtCode) {
      setWards([])
      return
    }
    fetch(`${API}/d/${districtCode}?depth=2`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.wards) ? data.wards.sort(byName) : []
        setWards(list)
      })
      .catch(() => setWards([]))
  }, [districtCode])

  return (
    <>
      <div className="form-group">
        <label>Tỉnh/Thành phố *</label>
        <select
          value={provinceCode}
          onChange={(e) => {
            const code = e.target.value
            setProvinceCode(code)
            setDistrictCode('')
            const p = provinces.find((x) => String(x.code) === String(code))
            onChange?.({ city: p?.name || '', district: '', ward: '' })
          }}
          required
        >
          <option value="">Chọn tỉnh/thành</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Quận/Huyện *</label>
        <select
          value={districtCode}
          onChange={(e) => {
            const code = e.target.value
            setDistrictCode(code)
            const d = districts.find((x) => String(x.code) === String(code))
            onChange?.({ district: d?.name || '', ward: '' })
          }}
          disabled={!provinceCode}
          required
        >
          <option value="">Chọn quận/huyện</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Phường/Xã *</label>
        <select
          value={String(ward || '')}
          onChange={(e) => onChange?.({ ward: e.target.value })}
          disabled={!districtCode}
          required
        >
          <option value="">Chọn phường/xã</option>
          {wards.map((w) => (
            <option key={w.code} value={w.name}>{w.name}</option>
          ))}
        </select>
      </div>
    </>
  )
}

