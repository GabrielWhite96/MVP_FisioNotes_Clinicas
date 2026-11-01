import { beforeEach, describe, expect, it } from 'vitest'
import { classifyAdultBmi, computeBmi, bmiFromMeasures } from '@/features/clinical-tools/model/calculators/bmi'
import { brzyckiOneRepMax, computeOneRepMax } from '@/features/clinical-tools/model/calculators/one-rep-max'
import { predictSixMinuteWalk } from '@/features/clinical-tools/model/calculators/six-minute-walk'
import { estimateMaxHeartRate, karvonenTarget, computeTrainingHeartRate } from '@/features/clinical-tools/model/calculators/training-heart-rate'
import { classifyWaist, classifyWaistHip, computeWaist, waistHipRatio } from '@/features/clinical-tools/model/calculators/waist'
import { CLINICAL_TOOLS, catalogIssues, getToolBySlug } from '@/features/clinical-tools/model/catalog'
import { filterTools, normalizeSearch } from '@/features/clinical-tools/model/search'
import { pushRecent, readFavorites, readRecents, toggleFavorite } from '@/features/clinical-tools/model/storage'

describe('clinical tools catalog', () => {
  it('keeps ids, sources and relations consistent', () => {
    expect(catalogIssues()).toEqual([])
    expect(CLINICAL_TOOLS.length).toBeGreaterThan(20)
  })

  it('finds the timed up and go by fall symptom without accents', () => {
    const found = filterTools(CLINICAL_TOOLS, { text: 'queda' })
    expect(found.map((tool) => tool.id)).toContain('timed-up-and-go')
    expect(normalizeSearch('Frequência')).toBe('frequencia')
  })

  it('filters calculators and knee tools', () => {
    const calculators = filterTools(CLINICAL_TOOLS, { categoryId: 'calculators' })
    expect(calculators.every((tool) => tool.kind === 'calculator')).toBe(true)
    expect(calculators.map((tool) => tool.id)).toContain('imc')

    const knee = filterTools(CLINICAL_TOOLS, { text: 'joelho' }).map((tool) => tool.id)
    expect(knee).toEqual(expect.arrayContaining(['womac', 'osteoartrite-joelho']))
    expect(knee).not.toContain('agachamento-parcial')
  })

  it('lists application protocols only for tests that have steps', () => {
    const protocols = filterTools(CLINICAL_TOOLS, { categoryId: 'application_protocols' })
    expect(protocols.map((tool) => tool.id)).toContain('timed-up-and-go')
    expect(protocols.map((tool) => tool.id)).not.toContain('imc')
    expect(protocols.every((tool) => tool.kind === 'clinical_test' && (tool.steps?.length ?? 0) > 0)).toBe(true)
  })

  it('does not reproduce copyrighted questionnaire items', () => {
    for (const id of ['oswestry', 'berg', 'womac']) {
      const tool = getToolBySlug(id)
      expect(tool?.license.status).toBe('copyright_restricted')
      expect(tool?.steps).toBeUndefined()
    }
    expect(getToolBySlug('dash')?.steps).toBeUndefined()
  })

  it('leaves empty subcategories without invented tools', () => {
    const pediatric = filterTools(CLINICAL_TOOLS, { categoryId: 'clinical_tests', subcategoryId: 'pediatrico' })
    const electrotherapy = filterTools(CLINICAL_TOOLS, { categoryId: 'therapeutic_resources', subcategoryId: 'eletroterapia' })
    expect(pediatric).toEqual([])
    expect(electrotherapy).toEqual([])
  })
})

describe('clinical calculators', () => {
  it('classifies adult BMI with WHO cutoffs', () => {
    expect(bmiFromMeasures(70, 170)).toBeCloseTo(24.221, 2)
    expect(classifyAdultBmi(bmiFromMeasures(70, 170))).toBe('normal')
    expect(classifyAdultBmi(18.5)).toBe('normal')
    expect(classifyAdultBmi(24.9)).toBe('normal')
    expect(classifyAdultBmi(25)).toBe('overweight')
    expect(classifyAdultBmi(bmiFromMeasures(100, 170))).toBe('obesity1')
    expect(classifyAdultBmi(17.3)).toBe('underweight')
    expect(classifyAdultBmi(40)).toBe('obesity3')

    const invalid = computeBmi({ weightKg: '10', heightCm: '170' })
    expect(invalid).toEqual({ error: 'o peso em kg: o mínimo aceito neste campo é 20.' })
  })

  it('computes Karvonen targets from Tanaka and the moderate ACSM zone', () => {
    expect(estimateMaxHeartRate(40, 'tanaka')).toBeCloseTo(180, 5)
    expect(estimateMaxHeartRate(60, 'fox')).toBe(160)
    expect(estimateMaxHeartRate(60, 'tanaka')).toBeCloseTo(166, 5)
    expect(karvonenTarget(180, 60, 40)).toBeCloseTo(108, 5)
    expect(karvonenTarget(180, 60, 59)).toBeCloseTo(130.8, 5)

    const result = computeTrainingHeartRate({
      method: 'tanaka',
      age: '40',
      restingHr: '60',
      zone: 'moderate',
    })
    expect(result).toMatchObject({
      lines: [
        { value: '180 bpm' },
        { value: '108–131 bpm' },
      ],
    })
  })

  it('classifies waist circumference and waist-hip ratio with WHO thresholds', () => {
    expect(classifyWaist('male', 95)).toBe('increased')
    expect(classifyWaist('male', 102)).toBe('substantially_increased')
    expect(classifyWaist('female', 79)).toBe('below')
    expect(classifyWaist('female', 88)).toBe('substantially_increased')
    expect(waistHipRatio(90, 100)).toBeCloseTo(0.9, 5)
    expect(classifyWaistHip('male', 0.9)).toBe('substantially_increased')
    expect(classifyWaistHip('female', 0.84)).toBe('below')

    const result = computeWaist({ sex: 'female', waistCm: '88', hipCm: '100' })
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.lines[0]?.detail).toBe('Risco substancialmente aumentado')
      expect(result.lines[1]?.value).toBe('0,88')
    }
  })

  it('estimates Brzycki 1RM only up to 10 repetitions', () => {
    expect(brzyckiOneRepMax(100, 10)).toBeCloseTo(133.333, 2)
    expect(brzyckiOneRepMax(80, 1)).toBeCloseTo(80, 5)
    const rejected = computeOneRepMax({ weightKg: '100', reps: '11' })
    expect(rejected).toEqual({ error: 'as repetições: o máximo aceito neste campo é 10.' })
  })

  it('applies the Enright six-minute walk equations', () => {
    const man = predictSixMinuteWalk({ sex: 'male', age: 70, heightCm: 170, weightKg: 70 })
    expect(man.predictedMeters).toBeCloseTo(503.3, 1)
    expect(man.lowerLimitMeters).toBeCloseTo(350.3, 1)
    expect(man.outsideDerivationAge).toBe(false)

    const young = predictSixMinuteWalk({ sex: 'female', age: 30, heightCm: 160, weightKg: 60 })
    expect(young.outsideDerivationAge).toBe(true)
    expect(young.predictedMeters).toBeCloseTo(2.11 * 160 - 2.29 * 60 - 5.78 * 30 + 667, 5)
  })
})

describe('clinical tool preferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('toggles favorites and keeps the twelve most recent tools', () => {
    expect(toggleFavorite('imc')).toEqual(['imc'])
    expect(toggleFavorite('nprs')).toEqual(['nprs', 'imc'])
    expect(toggleFavorite('imc')).toEqual(['nprs'])
    expect(readFavorites()).toEqual(['nprs'])

    for (let index = 0; index < 14; index += 1) pushRecent(`tool-${index}`)
    const recents = readRecents()
    expect(recents).toHaveLength(12)
    expect(recents[0]).toBe('tool-13')
    expect(recents).not.toContain('tool-0')
  })
})
