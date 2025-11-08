import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 シードデータを投入中...');

  // 既存のデータをクリア
  await prisma.testAttempt.deleteMany();
  await prisma.question.deleteMany();

  // 問題1: 長文読解（環境問題）
  await prisma.question.create({
    data: {
      title: '長文読解: 環境問題',
      questionText: `Read the following passage and answer the question below.

**Climate Change and Its Impact**

Climate change is one of the most pressing issues facing our planet today. The Earth's average temperature has risen by approximately 1.1°C since the late 19th century, primarily due to increased carbon dioxide emissions and other human activities. This warming trend is causing significant changes to our environment, including rising sea levels, more frequent extreme weather events, and shifts in wildlife populations and habitats.

Scientists warn that if we continue on our current path, the consequences could be severe. Coastal cities may face flooding, agricultural productivity could decline in many regions, and millions of people may be displaced due to climate-related disasters. However, there is still hope. By transitioning to renewable energy sources, improving energy efficiency, and protecting natural ecosystems, we can mitigate the worst effects of climate change.

**Question**: According to the passage, what are the main causes of climate change, and what solutions does the author suggest?`,
      questionType: 'reading',
      difficulty: 'medium',
      correctAnswer: 'The main cause of climate change mentioned in the passage is increased carbon dioxide emissions and other human activities. The author suggests three main solutions: transitioning to renewable energy sources, improving energy efficiency, and protecting natural ecosystems.',
      options: null,
      maxScore: 20,
    },
  });

  // 問題2: 語彙問題（ビジネス英語）
  await prisma.question.create({
    data: {
      title: '語彙問題: ビジネス英語',
      questionText: `Choose the correct meaning of the word "leverage" as used in business context.

"The company plans to leverage its strong brand reputation to enter new markets."`,
      questionType: 'vocabulary',
      difficulty: 'easy',
      correctAnswer: 'B',
      options: JSON.stringify([
        'A) To lift something heavy',
        'B) To use something to maximum advantage',
        'C) To negotiate a deal',
        'D) To analyze financial data',
      ]),
      maxScore: 10,
    },
  });

  // 問題3: 文法問題（時制）
  await prisma.question.create({
    data: {
      title: '文法問題: 時制',
      questionText: `Choose the correct verb form to complete the sentence.

"By the time you arrive, we __________ the project."`,
      questionType: 'grammar',
      difficulty: 'medium',
      correctAnswer: 'B',
      options: JSON.stringify([
        'A) will finish',
        'B) will have finished',
        'C) are finishing',
        'D) finished',
      ]),
      maxScore: 10,
    },
  });

  // 問題4: 長文読解（ビジネス）
  await prisma.question.create({
    data: {
      title: '長文読解: ビジネスケーススタディ',
      questionText: `Read the following business scenario and answer the questions below.

**The Digital Transformation Challenge**

TechCorp, a traditional manufacturing company with 50 years of history, is facing increasing pressure from digitally native competitors. While the company has maintained steady profits through its established client relationships, recent market research indicates that younger customers prefer to purchase products online with same-day delivery options—services that TechCorp currently does not offer.

The CEO has proposed a comprehensive digital transformation strategy that would require a $50 million investment over three years. This plan includes building an e-commerce platform, implementing AI-driven supply chain management, and retraining the existing workforce. However, the board of directors is divided. Some members argue that the investment is too risky and could jeopardize the company's financial stability. Others believe that failing to adapt could result in the company becoming obsolete within a decade.

The CFO has presented two options:
1. **Aggressive Transformation**: Invest the full $50 million immediately, potentially capturing market share quickly but risking short-term financial strain.
2. **Gradual Approach**: Phase the investment over five years with $10 million annually, reducing financial risk but potentially losing competitive advantage.

**Questions**:
1. What is the main challenge facing TechCorp?
2. What are the risks and benefits of each proposed option?
3. If you were advising the CEO, which approach would you recommend and why?`,
      questionType: 'reading',
      difficulty: 'hard',
      correctAnswer: null,
      options: null,
      maxScore: 25,
    },
  });

  // 問題5: 記述問題（意見）
  await prisma.question.create({
    data: {
      title: '記述問題: 意見表明',
      questionText: `Write a short paragraph (100-150 words) expressing your opinion on the following statement:

"Remote work should become the standard for all office jobs, not just an option."

Include:
- Your position (agree or disagree)
- At least two reasons supporting your position
- One potential counterargument and your response to it`,
      questionType: 'writing',
      difficulty: 'hard',
      correctAnswer: null,
      options: null,
      maxScore: 20,
    },
  });

  console.log('✅ シードデータの投入が完了しました！');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

