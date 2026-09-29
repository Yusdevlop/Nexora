import { useEffect, useRef, useState } from 'react'

/** Dəyər dəyişəndə rəqəm yumşaq şəkildə yeni qiymətə "axır" (məs. 740 → 840). */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      from.current = value
      return
    }
    const a = from.current
    const b = value
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 700)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = a + (b - a) * eased
      from.current = v
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{format(Math.round(shown * 100) / 100)}</>
}
