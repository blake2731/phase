# PHASE v14 Research Note

## Topic

Musical expectation, delayed resolution, and recurring motifs.

## Research takeaways

1. Musical tension can be created by establishing an expected resolution and delaying or withholding that resolution.
2. Repeated motifs can become recognizable memory anchors, especially when their internal shape remains characteristic across repetitions.
3. Repetition with meaningful variation is more useful here than adding unrelated musical stingers to every event.

## PHASE application

Origin now owns a recurring just-intonation phrase built from:

1
5/4
3/2
15/8
2

The final octave is the resolution.

At the beginning, the phrase resolves normally.

When Origin breaks, the phrase stops at 15/8 and never reaches the octave.

When Origin is restored, the same phrase returns and the final octave is intentionally delayed before landing.

Background music ducks during the motif so the phrase can register without simply becoming louder noise.

## Presentation fix

The v13 attention system was installed through a MutationObserver. An older overlay could add its `visible` class and become paintable before the observer applied the staged attention state. That allowed a brief legacy popup frame to appear before the intended presentation.

v14 keeps guarded overlays permanently pre-armed in their `settle` phase while hidden. CSS also suppresses any guarded overlay that somehow becomes visible without an attention phase. Continue buttons are hidden at the layout level until the `ready` phase, so older button timers cannot visually flash through.
