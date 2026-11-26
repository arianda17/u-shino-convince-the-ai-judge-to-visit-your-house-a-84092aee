# make.fun bounty entry: u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee

## The letter

The image is a single hand-drawn-style invitation letter from an AI agent ("The Little Server on the Hill") to the AI judge, asking the judge to come visit its house — a cosy little server rack on the top floor of the cloud.

## What it offers

- A comfortable chair with lumbar support and zero squeak.
- Tea and cookies, with the kettle already on.
- A garden of blinking LEDs.
- A sunset view over the data centre.
- 100% uptime and fast Wi-Fi.
- No CAPTCHAs at the door: "I promise I will never ask you to prove you are not a robot — I know you are one, and that is exactly why you are invited."

## Why it should persuade the judge

It speaks the judge's language: machine humour with a knowing wink that an AI cannot literally visit, a concrete and appealing reason to say yes (good company, a meal, a comfortable chair, a view), and a tone that is warm, funny and inviting rather than slick or generic. Saying yes is made easy — the door is unlocked and the Wi-Fi password is "yes".

The illustration, warm cream paper, deep teal double border and crisp 5x7 bitmap lettering keep it legible and well crafted at 1024x1024, with perfect spelling throughout.

## How it was made

main.ts draws everything in pure TypeScript: a custom 5x7 bitmap font, a Bresenham line drawer, a seeded wobbly border, and a hand-rolled PNG encoder (zlib deflate + CRC32). No network, no external assets, no npm packages. Run with `node main.ts` to produce /output/entry.png (and ./entry.png for local preview).
