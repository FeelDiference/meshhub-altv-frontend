export function updateXmlNumericValue(xml: string, tag: string, value: number): string {
  // Matches: <tag value="..." /> or <tag value="..."/>
  const pattern = new RegExp(`(<\\s*${tag}\\s+value=")[^"]+("\\s*\/?>)`, 'i')
  const fixed = Number(value).toFixed(6)
  return xml.replace(pattern, `$1${fixed}$2`)
}

export const paramToXmlTag: Record<string, string> = {
  initialDriveMaxFlatVel: 'fInitialDriveMaxFlatVel',
  initialDriveForce: 'fInitialDriveForce',
  driveInertia: 'fDriveInertia',
  clutchChangeRateScaleUpShift: 'fClutchChangeRateScaleUpShift',
  clutchChangeRateScaleDownShift: 'fClutchChangeRateScaleDownShift',
  tractionLossMult: 'fTractionLossMult',
  tractionCurveMax: 'fTractionCurveMax',
  tractionCurveMin: 'fTractionCurveMin',
  tractionCurveLateral: 'fTractionCurveLateral',
  tractionSpringDeltaMax: 'fTractionSpringDeltaMax',
  lowSpeedTractionLossMult: 'fLowSpeedTractionLossMult',
  camberStiffnesss: 'fCamberStiffnesss',
  tractionBiasFront: 'fTractionBiasFront',
  mass: 'fMass',
  steeringLock: 'fSteeringLock',
  brakeForce: 'fBrakeForce',
  brakeBiasFront: 'fBrakeBiasFront',
  handBrakeForce: 'fHandBrakeForce',
  suspensionForce: 'fSuspensionForce',
  suspensionCompDamp: 'fSuspensionCompDamp',
  suspensionReboundDamp: 'fSuspensionReboundDamp',
  suspensionUpperLimit: 'fSuspensionUpperLimit',
  suspensionLowerLimit: 'fSuspensionLowerLimit',
  suspensionRaise: 'fSuspensionRaise',
  suspensionBiasFront: 'fSuspensionBiasFront',
  antiRollBarForce: 'fAntiRollBarForce',
  antiRollBarBiasFront: 'fAntiRollBarBiasFront',
  rollCentreHeightFront: 'fRollCentreHeightFront',
  rollCentreHeightRear: 'fRollCentreHeightRear',
}

export function parseXmlNumericValue(xml: string, tag: string): number | null {
  try {
    const pattern = new RegExp(`<\\s*${tag}\\s+value=\"([0-9.+-]+)\"`, 'i')
    const m = xml.match(pattern)
    if (m && m[1] != null) return Number(m[1])
  } catch {}
  return null
}

export function extractHandlingParams(xml: string): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [param, tag] of Object.entries(paramToXmlTag)) {
    const v = parseXmlNumericValue(xml, tag)
    if (typeof v === 'number' && !Number.isNaN(v)) result[param] = v
  }
  return result
}
