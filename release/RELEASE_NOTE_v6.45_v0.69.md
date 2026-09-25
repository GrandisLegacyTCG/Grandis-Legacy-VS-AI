# Grandis Legacy VS AI v6.45 / Tutorial v0.69

Date: 2026-09-25

## Scope

This corrective release changes exactly two areas:

1. Final passive opponent-hand card-back perimeter cleanup across Desktop, Tablet Landscape, Tablet Portrait, and Phone. The original card-back asset is unchanged.
2. Tutorial Player End -> AI handoff reconciliation. A stale Guide Hold with no real blocking Tutorial work is released deterministically; genuine mandatory Tutorial work still blocks.

VS AI remains **v6.45**. Tutorial is promoted from **v0.68** to **v0.69**.

## Locked areas

AI Reposition v6.45, Lobby, Hero formation/rank preview, navigation, Quick Preview, Card Played sizing, gameplay card rules, Hero Components, Response, Rank Up, deck logic, and general AI logic are unchanged.

## Browser acceptance

Opponent-hand screenshots are generated from the production root renderer at 1366x768, 1024x768, 768x1024, and 390x844. Tutorial handoff is exercised in a real Chromium Tutorial document, including stale-hold and legitimate-hold cases.
