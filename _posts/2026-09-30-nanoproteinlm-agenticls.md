---
title: "Hill-Climbing a Protein Language Model: A Taste of Autoresearch for Scientific Discovery"
date: 2026-09-30
description: "Our AgenticLS 2026 workshop paper on turning protein language model training into an environment where agents can do research."
excerpt: "Our AgenticLS 2026 workshop paper on turning protein language model training into an environment where agents can do research."
---

<style>
.lede { margin: 0.5em 0 2em; padding: 0.1em 0 0.1em 1.1em; border-left: 3px solid #2563eb; font-size: 1.12em; line-height: 1.6; color: #1f2937; }
.lede p { margin: 0 0 0.8em; }
.lede p:last-child { margin-bottom: 0; }
.paper-links .btn { margin: 0 0.4em 0.4em 0; }
.refs { font-size: 0.85em; }
.refs li:target { background: #dbeafe; }
.paper-links .btn i { margin-right: 0.3em; }
/* Side notes: in the right margin on wide screens, an inline card on narrow ones.
   Hovering the marker highlights its note; following a link to it flashes it. */
.sn-ref > a { text-decoration: none; font-weight: 700; color: #2563eb; padding: 0 0.15em; border-radius: 3px; }
.sn-ref > a:hover, .sn-ref > a:focus { background: #dbeafe; }
.sidenote { display: block; margin: 0.8em 0 1em; padding: 0.7em 1em; background: #f5f8ff; border-left: 3px solid #2563eb; border-radius: 0 6px 6px 0; font-size: 0.82em; line-height: 1.5; color: #374151; transition: background 0.2s ease; }
.sidenote .sn-label { display: block; margin-bottom: 0.25em; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #2563eb; }
.sn-ref:hover + .sidenote, .sn-ref:focus-within + .sidenote { background: #dbeafe; }
.sidenote:target { animation: sn-flash 1.8s ease; }
@keyframes sn-flash { 0%, 30% { background: #dbeafe; } 100% { background: #f5f8ff; } }
@media (min-width: 80em) {
  .sidenote { float: right; clear: right; width: 11rem; margin: 0.2em -11.5rem 0.8em 0; padding: 0.15em 0 0.15em 0.8em; font-size: 0.78em; background: transparent; border-left-width: 2px; border-radius: 0; }
  .sn-ref:hover + .sidenote, .sn-ref:focus-within + .sidenote { background: #eef4ff; }
  .sidenote:target { animation: sn-flash-margin 1.8s ease; }
  @keyframes sn-flash-margin { 0%, 30% { background: #dbeafe; } 100% { background: transparent; } }
}
</style>

<div class="lede">
<p>Recursive self-improvement (RSI) has recently shown great promise for scientific discovery: agentic hill-climbing has sped up biomolecular models [<a href="#ref-1">1</a>], improved LM training and GPU kernels [<a href="#ref-2">2</a>], and maxed out Atari Breakout [<a href="#ref-3">3</a>]. However, RSI does not work out of the box on an arbitrary science problem. We believe the hard part is not the climbing but the hill: choosing the right research question, scoping the search space, and designing evaluations that track real scientific progress. This project offers a first taste of what it takes to build such a hill.</p>
<p>In the spirit of NanoGPT, we made protein language model research hill-climbable, with an open 666M-protein corpus, a readable trainer, frozen evaluations and an explicit protocol, and we show that a plain sequential search with a human gate already produces a much better training recipe than the ESMC baseline.</p>
</div>

## A better PLM recipe by hill-climbing NanoProteinLM

If a research question can be turned into a loop that an agent runs without waiting on a person, the agent can try far more ideas than a lab could by hand, and each change it keeps becomes the starting point for the next. We wanted to see how far that goes on a real problem, so we tried it on protein language model training.

<figure>
<img src="/assets/img/nanoproteinlm/matched-scaleup.png" alt="Training loss, contact precision and validation loss of the ESMC baseline and the scaled recipe over 100k training steps" width="100%">
<figcaption>The ESMC baseline (blue) and the recipe found with autoresearch (orange), trained on the same 48.4B tokens. Left, training loss. Right, contact precision (solid) and validation loss (dashed).</figcaption>
</figure>

Starting from the ESMC recipe, a simple sequential search, with a human deciding which recipes to scale up, gave a recipe with about 30% higher long-range contact precision, from 28.2% to 36.6% P@L, at the same 48.4B-token budget.

Behind the scenes, the hard problem did not lie in the design of the autoresearch harness.<sup class="sn-ref"><a href="#note-search">1</a></sup><span class="sidenote" id="note-search"><span class="sn-label">Side note 1</span>We use a very simple Karpathy-style sequential search, which is certainly not the best harness one could build. Our aim is not a better autoresearch algorithm; we want to understand what makes a task hill-climbable.</span> It lay in the environment around the scientific loop: the data, the evaluation, the budget and the rules that let the loop run unattended and still tell us something true about proteins.

## Building hill-climbable environments for research tasks

Not every science question is hill-climbable.<sup class="sn-ref"><a href="#note-amdahl">2</a></sup><span class="sidenote" id="note-amdahl"><span class="sn-label">Side note 2</span>One way to see this is something like Amdahl's law for autoresearch. Split a research round into the time it takes to get a useful scientific signal back, by running the experiment and measuring the result, and the time a researcher spends deciding what to try next. Even an agent as capable as the best human researcher can only shrink the second part, so the speed-up it buys is at most $$1 + T_\text{decide} / T_\text{signal}$$. Hill-climbing pays off most when progress is capped by researcher effort, as with compute experiments that finish in an hour while a person needs a day to choose the next one. When the smallest loop that returns a useful signal is itself slow or expensive, such as a week of growing cells, automation buys little and the quality of each decision matters more.</span> For tasks where hill-climbing does pay off, we apply the following general principles to design the environment.

| Item | What it fixes |
| --- | --- |
| Research objective | The scientific outcome the campaign should improve, fixed before search. |
| Design space | What the agent may change and what must stay fixed, with bounds that exclude gains the objective does not value. |
| Round budget | The resources each candidate may spend, identical for the baseline and every candidate so rewards compare across rounds. |
| Round reward | A scalar measured on held-out validation data after each round, which the loop compares with the incumbent's to keep or discard the candidate. |
| Validation | A larger-budget retraining of the selected recipe against the baseline, testing whether search-time gains carry over. |

## Failure mode: Perfect on reward, failure on science

Here we show an example of the most typical way reward hacking makes autoresearch go wrong. To see how agents behave in this environment, we let Codex Astra and Claude Opus 5.5 each run 72 rounds of search against validation loss. Both lowered the loss, and after 12 hours of training both recipes still beat our reference on it. Their contact precision (a proxy metric for downstream protein folding), though, shows a large gap to the best setting.

<figure>
<img src="/assets/img/nanoproteinlm/figure4-table4-agents.png" alt="Retained validation loss of the two agents over 72 rounds, beside a table of search and 12-hour scale-up results" width="100%">
<figcaption>Left, retained validation loss over 72 rounds from a shared baseline. Right, search results and a fixed 12-hour scale-up, with each recipe's gap to our reference recipe in colour.</figcaption>
</figure>

The agent optimizes the reward as written, and any gap between that reward and the scientific goal is open to it. That is also why the evaluation took most of our effort in the previous section. A reward that has not been tested carefully can be hacked in more ways than you can imagine in advance.

## What survived the human gate

Our main campaign ran a Karpathy-style sequential hill-climber, deliberately simple and far from optimal ([side note 1](#note-search)), with the following settings:

- Every candidate trains with two seeds and is kept only if its mean gain beats the seed-to-seed spread.
- P@L is too noisy to steer by at one hour, so we climbed validation loss while watching P@L, then ran a second search on P@L itself.
- A final scaled-up ablation of the confirmed improvements.

<figure>
<img src="/assets/img/nanoproteinlm/search-rewards.png" alt="Two sequential searches: validation loss over 38 candidates and contact precision over 35 candidates" width="100%">
<figcaption>The two searches, rewarded by validation loss (left) and contact precision (right). Points are two-seed means; blue steps track the retained recipe; numbers mark accepted changes.</figcaption>
</figure>

<figure>
<img src="/assets/img/nanoproteinlm/table2-ladder.png" alt="Search-time and 24.2B-token results for each accepted change, with shaded rows for the changes kept" width="100%">
<figcaption>Each recipe adds one accepted change to the recipe named before the plus sign. Shaded rows are the changes kept in the final recipe; deltas are against that parent at 24.2B tokens.</figcaption>
</figure>

Four of the seven changes survive the final ablation study. All four change the optimizer, the loss weighting or how batches are split across GPUs.

## Takeaway

NanoProteinLM carries our vision of an open research environment that connects scientists with agentic researchers.

**For protein researchers**, we provide a minimal reproduction of ESMC-style model training: public data, readable PyTorch code, training recipes and evaluations in one place. We aim to contribute an open-source foundation that researchers can understand, reproduce and extend in support of open science.

**For agentic researchers**, it provides a controlled environment for iterative autoresearch on the same scientific objective. Deterministic data selection, fixed seeds, explicit compute budgets and frozen evaluation protocols make recipe changes measurable. An agent can modify the training recipe, train, evaluate and improve it; the choice of agent and search strategy remains yours.

## Authors and links

For more details, please refer to our paper, accepted as a spotlight presentation at the AgenticLS workshop (Agentic AI for Biological Discovery) at NeurIPS 2026.

<p class="paper-links">
<a href="https://www.alphaxiv.org/abs/2609.nanoproteinlm-hill-climbable-protein-models" class="btn btn--primary"><i class="fas fa-file-lines" aria-hidden="true"></i> Paper</a>
<a href="https://github.com/Lumin-Science/Nano-ProteinLM" class="btn btn--inverse"><i class="fab fa-github" aria-hidden="true"></i> Code</a>
<a href="https://huggingface.co/datasets/LuminScience/LuminBench-Nano-ESMC" class="btn btn--inverse"><i class="fab fa-hugging-face" aria-hidden="true"></i> Data</a>
</p>

Muchen Li (University of British Columbia) and Chixiang Lu (The University of Hong Kong)

```bibtex
@inproceedings{nanoproteinlm2026,
  title     = {NanoProteinLM: Towards Hill-Climbable Protein Language Model Research},
  author    = {Li, Muchen and Lu, Chixiang},
  booktitle = {NeurIPS 2026 Workshop on Agentic AI for Biological Discovery},
  year      = {2026}
}
```

## References

<ol class="refs">
<li id="ref-1">Anthropic. <a href="https://www.anthropic.com/research/claude-uplifts-biomolecular-modeling">How Claude is uplifting biomolecular modeling</a>. September 2026.</li>
<li id="ref-2">Recursive Superintelligence, Inc. <a href="https://www.recursive.com/articles/first-steps-toward-automated-ai-research">First steps toward automated AI research</a>. June 2026.</li>
<li id="ref-3">Jiayi Weng. <a href="https://trinkle23897.github.io/learning-beyond-gradients/">Learning beyond gradients</a>. May 2026.</li>
</ol>
