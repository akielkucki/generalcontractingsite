# Red Bridge Construction

A single page site for Red Bridge Construction LLC, a general contractor in Kintnersville, PA.

It reuses the structure and motion of the Caleb Electric demo in `../ElectricalSite`, rebuilt
around Red Bridge's brand red and weighted much lighter: that site is dark end to end, this one
runs dark only in the header, the hero and the closing contact band.

## Running it

Any static server works, for example:

```bash
python -m http.server 8091 -d .
```

Then open http://localhost:8091.

## Files

| File | Contents |
|---|---|
| `index.html` | Full page markup, plus `GeneralContractor` JSON-LD |
| `css/styles.css` | Palette tokens, layout, responsive rules |
| `js/main.js` | Alpine components, GSAP hero entrance, scroll spy, nav helpers |

Libraries load from CDN: Manrope (Google Fonts), GSAP 3.12.5 with ScrollTrigger, Alpine.js 3.14.1.

## Before this goes live

Three things are deliberately left for you rather than guessed at. They are covered in detail
further down.

1. **Wire up the forms.** `FORM_ENDPOINT` at the top of `js/main.js` is empty, so both forms
   validate but tell the visitor plainly that nothing was sent. Nothing quietly disappears.
2. **Localise the photography.** Every image is currently hotlinked from the existing live site.
3. **Check the Google rating, the claims and the two bathroom photographs.** All noted below.

## Palette

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#14161A` | Header, hero, contact band, footer |
| `--slate` | `#1E2126` | Elevated dark surfaces |
| `--red` | `#C2371F` | Buttons, eyebrows, accents |
| `--red-light` | `#E4705A` | Accent text and focus rings on dark |
| `--paper` | `#FFFFFF` | Default page ground, cards |
| `--bone` | `#F7F5F2` | Alternating section ground, input wells |
| `--sand` | `#EFEAE3` | Image mats behind loading photographs |
| `--stone` | `#5A5F68` | Supporting text on light |
| `--mist` | `#A8ADB5` | Supporting text on dark |

`--red` is sampled from the existing site, which sets it as `#c2371f`. The typography is not
carried over: that site pairs Archivo with IBM Plex Mono, this one stays on Manrope to match the
Caleb Electric theme it is adapted from.

Every text pair was measured against its actual background. `--stone` on white is 6.4:1 and on
`--bone` 5.9:1. `--red` on white is 5.4:1, and white on `--red` is the same 5.4:1, so the primary
button passes AA. `--red` against `--ink` is only 3.3:1, which is why dark surfaces switch to
`--red-light` at 5.8:1 for anything that carries meaning, including focus rings.

## Section rhythm

Dark, then light for most of the page, then dark again to close:

hero → services (`--bone`) → projects (white) → about (`--bone`) → testimonials (white) →
FAQ (`--bone`) → contact (`--ink`) → footer (`--ink`)

Two dark blocks out of eight, bookending the page. That is the "more white" part of the brief.

## The one card style

Both request forms are the same white card. On the hero it floats over the photograph on
`--shadow-float`, at the foot of the page it sits on the ink band. Having one light form style
rather than a dark one and a light one is why the hero reads white at the top right, and it means
the field, label, error and select styles are written once.

The hero copy runs a tighter vertical rhythm than the contact card so the whole hero, marquee
included, still fits a 900px tall window. Control sizes are untouched, only the spacing.

## The hero scrim

The photograph runs full bleed behind the hero, so its legibility scrim is not guesswork.

Everything carrying text sits left of about 48 percent of the viewport: the supporting line stops
near 37 percent, and the facts strip, then the widest element in the column, ended around 46. The band
holds 0.80 cover or more across all of that and only then drops away, through the gap before the
white card and out to the margin beyond it, which is where the picture is actually allowed to
read. Measured against a blown out highlight, the worst case any stop can produce is 5.7:1 for
the supporting line and 6.0:1 for the facts labels.

Two things follow from that and are easy to undo by accident:

- `.hero__deck` is capped at 42ch, not the 52ch it would otherwise want. That is what keeps the
  supporting line inside the heavy part of the band.
- `.hero__facts dt` is `#C4C9D0` rather than `--mist`, because that strip ran the full width of
  the copy column, out to where the scrim has already started to release. The facts strip has
  since been taken out of the markup, so this is dormant. Its CSS is still in place, and the
  colour still matters if it ever comes back.

Nothing in the column is now wider than the 42ch supporting line, so the measured ratios above are
the conservative case rather than the current one.

The photograph is a dusk shot and reads very dark once scaled down, so it carries
`filter: brightness(1.1)` before the scrim goes over it. **If you swap the picture, re-check all
of this.** A daylight photograph under the text column will need the left stops raised and the
brightness lift removed.

## Hero layout

Above 900px the hero is two columns over the photograph: the review badge, headline, supporting
line and actions on the left, the request card on the right, and a marquee of services along the
bottom edge. The badge is `align-self: flex-start` so it sits flush with the left edge of the copy
column rather than stretching across it.

Below 900px the hero stacks and centres, the marquee and the card are both dropped, and the single
action carries people to the form at the foot of the page. Holding the copy, a second action and a
four field form in one column is what made the original congested.

A red band runs from the top of the hero down to the midpoint of the headline, so the first line
sits on red and the second on the picture. Its height is the space above the title plus exactly one
line box, which puts the edge between the two lines at any type scale and holds even at 320px where
a line has to wrap. Measured at 375px the band edge and the first line box bottom land on the same
pixel. The first line is white on the red, at 5.4:1.

If you change the headline's line height, change the band with it: the `1.09em` is that 1.05 line
height plus the 0.04em the mask adds below it. The band sits at `z-index: -1` and the picture at
`-2`, so the band covers the photograph and the copy runs over both.

**The band is anchored to the title, so anything placed above the title has to be added to it.**
The review badge is, which is why both the offset and the height carry `--badge-h + --badge-gap`:

```css
top:    calc(-1 * (var(--hero-pad-top) + var(--badge-h) + var(--badge-gap)));
height: calc(     var(--hero-pad-top) + var(--badge-h) + var(--badge-gap) + 1.09em);
```

Get that wrong and the band starts below the badge, leaving a strip of ink between the nav and the
red. That is also why `--badge-h` is a pinned pixel height and `.review-badge` carries no
`margin-top`: a badge whose box depends on line-height, or which pushes itself down with a margin,
cannot be measured by the band. Measured 320px to 899px, the band top sits on the hero top to the
pixel and the band bottom on the first line box bottom to the pixel, including at 320px where the
second line wraps.

## The marquee

Decorative repetition of the services listed further down the page, so the whole strip is
`aria-hidden` rather than read out twice. Two identical groups shifted by half the track give a
seamless loop, and the animation is switched off under `prefers-reduced-motion`.

## Navigation

Below 900px the links collapse into a fullscreen menu that wipes open from the top with a clip
path, with the links settling in behind it on a short stagger. The phone, email and hours cluster
with a full width action along the bottom edge. Those contact rows are tap targets, so they carry
a 44px minimum height rather than the 19px their text alone would give them. It is driven by a
class rather than a JavaScript animation, so the open state still lands correctly if the transition
never gets a frame to run in. Escape closes it and returns focus to the control, focus is trapped
while it is open, and the page behind it does not scroll.

Locking that scroll stops the root scrolling, which also stops the sticky header sticking, so
opening the menu part way down the page would otherwise drop the close control off the top of the
screen. The header is pinned explicitly while the menu is open, with matching padding standing in
for the space it gives up so the page underneath neither shifts nor changes height. Above 900px the
overlay is forced shut in CSS, so a menu left open across a resize cannot strand anyone.

The phone number in the bar is dropped below 1080px, where the five links plus the number plus the
action stop fitting. The action survives to 900px.

## Forms

Both forms validate name, email or phone, project type and description on the client, on blur and
on submit, staying quiet about an empty field nobody has tried to submit yet.

`FORM_ENDPOINT` at the top of `js/main.js` decides what happens next:

- **Empty, as shipped.** A valid submission swaps the form for a panel that says plainly that the
  site has no inbox connected yet and gives the phone number and email instead. The note under the
  send button says the same thing. Nothing is transmitted.
- **Set to a URL.** The form POSTs JSON (`name`, `contact`, `service`, `details`, `source`) to it,
  shows a sending state, and confirms with the one business day promise on success or offers the
  phone number on failure. Formspree, Basin, Netlify Forms or a small Worker all take this shape.
  Nothing else in the markup or the CSS needs to change.

## Photography

Every image is hotlinked from the existing live site, through its Next.js image optimiser, which
is what serves the resized WebP behind each `srcset`:

```
https://www.redbridgeconstructionllc.com/_next/image?url=%2Fportfolio%2F<name>&w=<width>&q=75
```

That works today and keeps the page fast, but it ties this site to the old one staying up. Before
launch, copy the six originals into `assets/portfolio/`, resize them, and swap the `src` and
`srcset` values. The originals are large: `bathroom_remodel.png` is 7.0MB and `bob_house.jpg` is
4.0MB, so they need resizing rather than dropping in as they are.

Six photographs are in use:

| File | Where it appears |
|---|---|
| `shed_remodel.jpg` | Hero, and the Detached Garage tile |
| `kitchen_remodel.png` | Services 01, and the Kitchen Remodel tile |
| `bob_house.jpg` | Services 02, and the New Construction tile |
| `client_project.jpg` | Services 03, and the Exterior Renovation tile |
| `bathroom_remodel.png` | The wide Primary Bath tile |
| `bathroom_remodel_2.jpg` | The Walk-In Shower tile, and the About figure |

Two deliberate changes from the current site:

**`ctabackground.jpg` is not used.** It is stock photography, not a Red Bridge project: the room
has a European wall socket in it. The current site captions it as a vanity from one of your
bathroom remodels. The About figure uses a real project photograph instead.

**The alt text and project titles were rewritten from the photographs themselves.** The
descriptions on the current site do not match its own pictures. `kitchen_remodel.png` is described
there as a gourmet kitchen with a Calacatta marble waterfall island and a plaster range hood; it is
a bright galley kitchen with shaker cabinets and stainless appliances. `bob_house.jpg` is described
as a finished modern home with floor to ceiling glass and a standing seam metal roof; it is a
structure being framed on concrete piers. `client_project.jpg` is described as a "before" shot of
peeling paint and failing flashings; it is a house wrapped in housewrap partway through an exterior
renovation. Everything on this page now describes what is actually in the frame, and the note under
the grid says some shots are taken partway through the work rather than at handover.

## The review badge

The five stars under the hero supporting line are five separate `.review-star` elements, staggered
in by the GSAP timeline at 0.085s apart, the same interval as the headline lines, so the two read
as one gesture. Each carries a `back.out(2.4)` overshoot so it lands rather than fades.

They are not one growing string. A keyframed `content` cannot do this: `content` only applies to
`::before` and `::after`, not to the element itself, and even on a pseudo-element it is a discrete
property with patchy support, so it would jump between states rather than stagger. If you ever do
want a single string revealed character by character, the portable way is a fixed `width` animated
`0` to `5ch` with `steps(5)` and `overflow: hidden`, not `content`.

The cluster is `aria-hidden`; the rating is announced by the text beside it.

It sits above the headline as a kicker: left aligned with the copy column on desktop, centred on
mobile, where it falls inside the red band. See the band maths under **Hero layout** before moving
it, and see **Motion** if it is ever removed.

The stars are gold, `#FFDC41`. Against the red band that is 4.0:1, under the 4.5:1 AA threshold,
which is survivable only because the cluster is decorative and `aria-hidden` and the rating is
carried by the white label beside it at 5.4:1. The testimonial stars further down the page are
`--red`, so two different star colours currently appear on the page; worth settling on one.

## Three things to confirm

**The Google rating.** "Rated 5.0 on Google" is new on this page. The current site shows five star
testimonials but does not state an overall score anywhere, so this number is not carried over from
anything verified. Either point it at the real Google Business Profile rating or take the badge
out before launch.

**The bathroom photographs.** `bathroom_remodel.png` and `bathroom_remodel_2.jpg` look like the
same room: the same gold sunburst ceiling fixture, the same dark vanity with a stone top. The
current site labels one New Hope and the other Doylestown. This page labels both New Hope and
titles them as two views of one project. If they really are two separate jobs, split them back
apart in the Projects grid.

**The claims.** 28+ years, 500+ projects delivered, the one year workmanship warranty, licensed and
insured in PA, free consultations, and the reply within one business day are all carried across
from the current site, and the FAQ answers are written around them. The three testimonials are
carried across verbatim. All of it should be confirmed as still true before launch, since the FAQ
now states some of it more specifically than the old site did.

## Logo

No logo artwork was supplied, and the current site has no logo file, only a red bar beside the
name. The mark here is drawn inline as SVG: a red span over two piers, at 30px, in the header and
the footer. It takes its colour from `currentColor`, so it follows the wordmark.

If real artwork turns up, replace the two inline `<svg class="wordmark__mark">` blocks with an
`<img>` and set `.wordmark__mark` to the size you want. There is no favicon yet either.

## Motion

One GSAP timeline runs the hero entrance, and it waits for Manrope to load so the masked headline
lines are measured against final metrics. The background photograph is not text, so it fades and
settles out of a slight scale on its own without waiting for the font. Section reveals use
ScrollTrigger. Under `prefers-reduced-motion: reduce` no JavaScript animation is created and
transitions are reduced to near zero.

Motion is only taken over once a real animation frame has been produced. In an environment that
never paints, such as a prerenderer, nothing is hidden and the page renders as static content.

Hero elements that can be removed from the markup are tweened only when they are present. GSAP
does not throw on a null target, it warns, so an absent element would otherwise leave a permanent
`GSAP target null not found` in the console that hides real warnings behind it. `.hero__facts` is
guarded for that reason. If you drop `.review-badge` or another hero element, guard it the same
way rather than leaving the tween pointing at nothing.

## Content

Copy, contact details, service lists, project locations and testimonials are adapted from
https://www.redbridgeconstructionllc.com. The FAQ answers are new, written around the claims that
site already makes.
