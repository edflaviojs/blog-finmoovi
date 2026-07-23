---
term: "z-score"
definition: "Understand what z-score is, how it works, advantages, risks and practical examples of application in the Brazilian financial market."
title: "z-score - Financial Glossary"
description: "Understand what z-score is, how it works, advantages, risks and practical examples of application in the Brazilian financial market."
image: "/images/glossario/z-score.webp"
category: "basico"
tags: ["z-score", "glossário", "finanças", "glossary", "finance", "brazil"]
author: "FinMoovi"
publishedAt: 2026-07-21
readingTime: 5
locale: "en"
translationKey: "glossario-z-score"
seo:
  metaTitle: "z-score - Financial Glossary"
  metaDescription: "Understand what z-score is, how it works, advantages, risks and practical examples of application in the Brazilian financial market."
  keywords: ["z-score", "glossário", "finanças", "glossary", "finance", "brazil"]
---

## What it is

The **z‑score** is a simple way to see how far a number is from the average of a group, measured in standard deviations. Think of it as a “distance meter” that tells you whether something is typical or an outlier. If your monthly expense is R$5,500 and the average expense of people with similar incomes is R$4,800, the z‑score shows how unusual that R$5,500 is compared to the crowd.

![What it is](/images/glossario/z-score-inline-1.webp)



- **Positive z‑score**: value is above the average.  
- **Negative z‑score**: value is below the average.  
- **Zero**: value equals the average.

## How it works

To calculate a z‑score you need three numbers: the value you’re evaluating, the mean (average) of the data set, and the standard deviation (a measure of how spread out the numbers are). The formula is:

\[
z = \frac{X - \mu}{\sigma}
\]

where **X** is your value, **μ** (mu) is the mean, and **σ** (sigma) is the standard deviation. The result tells you how many “steps” away from the average you are.

- Gather the data (e.g., salaries of 30 people).  
- Compute the mean (add all salaries and divide by 30).  
- Compute the standard deviation (a bit of arithmetic, or use a [spreadsheet](/en/posts/en-migrando-da-planilha-para-um-app-financeiro)).  
- Plug the numbers into the formula and get the z‑score.

## Advantages

Using the z‑score makes it easy to compare numbers that live in different scales. It turns raw amounts into a common language, so you can spot trends without getting lost in the details. For [personal finance](/en/posts/en-30-day-rule-for-purchases), it helps you understand whether your spending or saving habits are in line with peers.

![Advantages](/images/glossario/z-score-inline-3.webp)



- **Standardized comparison** across different income brackets.  
- Quick identification of **outliers** (values that are unusually high or low).  
- Works with any data set, from **monthly bills** to **investment returns**.  
- Simple to calculate with a calculator or spreadsheet.

## Risks

While the z‑score is handy, it’s not a magic wand. It assumes the data follows a normal distribution (the classic bell curve). If your data is heavily skewed—say, many people earn R$3,000 while a few earn R$8,000—the z‑score can mislead. Also, relying only on the z‑score ignores the underlying reasons behind the numbers.

- Misinterpretation when data isn’t **normally distributed**.  
- Over‑reliance can hide **contextual factors** (like a sudden medical expense).  
- Small sample sizes produce **unstable** standard deviations, leading to volatile scores.  
- It doesn’t tell you *why* a value is high or low, only *how* it differs.

## Practical examples

Imagine you earn R$6,000 a month and want to see how your spending on groceries compares to others in the same income range (R$5,000‑R$7,000). After collecting data from 50 peers, you find:

- Mean grocery spend: R$1,200  
- Standard deviation: R$300  
- Your grocery spend: R$1,800  

Your z‑score = (1,800 − 1,200) / 300 = 2.0. A score of 2 means you’re spending two standard deviations above the average—quite high.  

Now look at a different case: you earn R$4,000 and save R$800 each month. The group’s average savings are R$600 with a standard deviation of R$150. Your z‑score = (800 − 600) / 150 ≈ 1.33, indicating you’re saving better than most, but not dramatically so.

- **Example 1:** Salary R$3,500, rent R$1,200 → z‑score = ‑0.5 (below average rent).  
- **Example 2:** Salary R$7,800, investment in stocks R$2,500 → z‑score = 1.2 (above average investment).  
- **Example 3:** Salary R$5,200, [emergency fund](/en/glossario/en-reserva-de-emergencia) R$10,000 → z‑score = 2.5 (very strong safety net).

These numbers help you decide whether to cut back, keep the pace, or push harder.

## How to start

Getting comfortable with the z‑score doesn’t require a finance degree—just a spreadsheet and a few minutes each month. Follow these steps, and you’ll have a clear picture of where you stand.

- **Practical tip:** **Collect data** from at least 20 people in the same salary band (R$3,000‑R$8,000). Use a simple Google Sheet to log their monthly [expenses](/en/posts/en-5-dicas-para-se-preparar-financeiramente-para-o-segundo-seme).  
- **Practical tip:** **Calculate the mean** by summing the column and dividing by the number of entries. The sheet’s `=AVERAGE()` function does the job instantly.  
- **Practical tip:** **Use the built‑in STDEV.P function** (`=STDEV.P()`) to get the standard deviation, then apply the formula `=(YourValue‑Mean)/StdDev` in another column.  
- Review the resulting z‑scores: values between –1 and 1 are “normal,” while anything outside that range deserves a closer look.  
- Adjust your [budget](/en/posts/en-5-alternativas-ao-mobills-em-2026) or savings plan based on what the scores reveal.  
- Keep the sheet updated monthly; trends become clearer over time.

## Start today

You’ve got the tools, the numbers, and the know‑how. Take a quick look at your own expenses, plug them into a spreadsheet, and see where you land on the z‑score scale. A small habit like this can turn vague worries about [money](/en/posts/en-avoid-impulse-purchases) into concrete, actionable insights. Go ahead—open that sheet, enter your data, and start making smarter choices right now.

