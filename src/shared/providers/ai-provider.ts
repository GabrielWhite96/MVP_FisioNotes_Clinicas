export interface AIRecommendation {
  type: string
  content: string
  confidence?: number
}

export interface AIProvider {
  suggestExercises(patientContext: Record<string, unknown>): Promise<AIRecommendation[]>
  summarizeClinicalRecord(record: Record<string, unknown>): Promise<string>
}

export class MockAIProvider implements AIProvider {
  async suggestExercises(_patientContext: Record<string, unknown>): Promise<AIRecommendation[]> {
    return []
  }

  async summarizeClinicalRecord(_record: Record<string, unknown>): Promise<string> {
    return ''
  }
}

export const aiProvider: AIProvider = new MockAIProvider()
