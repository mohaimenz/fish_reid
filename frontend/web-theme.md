Rabbitfish Re-ID Tracker Website Theme Spec

This theme is built around the recommended palette:
	•	Primary brand: #134074
	•	Interactive blue: #2F6FED
	•	Marine accent: #14B8A6
	•	Warm contrast accent: #F25F5C
	•	Main background: #F8FAFC
	•	Main text: #0F172A

The overall direction is marine research + technical dashboard + clean scientific product.

⸻

1. Theme identity

Design goals

The site should feel:
	•	credible for research and technical demos
	•	modern enough for a public-facing project website
	•	clean and readable for data-heavy interfaces
	•	ecologically grounded without looking playful or overly tropical

Visual personality

Use:
	•	deep navy for trust and structure
	•	bright blue for interaction
	•	teal for ecology and tracking intelligence
	•	coral sparingly for emphasis
	•	soft slate neutrals for balance

Avoid:
	•	oversaturated gradients everywhere
	•	too many bright colours competing at once
	•	pure black backgrounds unless in dark mode
	•	neon “cyber” styling

⸻

2. Core colour system

Brand colours

Primary 900  #0B2545
Primary 700  #134074
Primary 500  #2F6FED
Primary 300  #7FB3FF
Primary 100  #EAF3FF

Teal 700     #0F766E
Teal 500     #14B8A6
Teal 100     #DDF8F4

Coral 600    #F25F5C
Coral 100    #FFE5E3

Neutral colours

Slate 950    #0F172A
Slate 800    #1E293B
Slate 600    #475569
Slate 400    #94A3B8
Slate 300    #CBD5E1
Slate 200    #E2E8F0
Slate 100    #F1F5F9
Slate 50     #F8FAFC
White        #FFFFFF

Support colours

Sand 200     #F3E9D2
Seafoam 200  #CDEFEA
Kelp 600     #4D7C0F

Semantic colours

Success dark   #166534
Success base   #22C55E
Success light  #DCFCE7

Warning dark   #B45309
Warning base   #F59E0B
Warning light  #FEF3C7

Error dark     #B91C1C
Error base     #EF4444
Error light    #FEE2E2

Info dark      #1D4ED8
Info base      #3B82F6
Info light     #DBEAFE


⸻

3. Colour role mapping

Page structure
	•	App/page background: #F8FAFC
	•	Surface/card background: #FFFFFF
	•	Secondary surface: #F1F5F9
	•	Border/default divider: #E2E8F0
	•	Strong section separator: #CBD5E1

Typography colours
	•	Primary text: #0F172A
	•	Secondary text: #475569
	•	Muted text: #94A3B8
	•	Inverse text on dark areas: #FFFFFF

Interactive mapping
	•	Primary action: #2F6FED
	•	Primary hover: #134074
	•	Primary pressed: #0B2545
	•	Secondary action: #14B8A6
	•	Secondary hover: #0F766E
	•	Attention/emphasis: #F25F5C

Data/tracker state mapping
	•	Confirmed match / valid identity: #14B8A6
	•	Active tracked target: #2F6FED
	•	Needs review / uncertain: #F59E0B
	•	Mismatch / lost track / failure: #EF4444
	•	Special highlight / manual selection: #F25F5C

⸻

4. Typography spec

Type pairing

A safe and modern pairing:
	•	Headings: Inter, Manrope, or Sora
	•	Body/UI text: Inter
	•	Code / IDs / technical labels: JetBrains Mono or IBM Plex Mono

My recommendation:
	•	Primary UI font: Inter
	•	Monospace font: JetBrains Mono

Font weights
	•	Heading large: 700
	•	Heading medium: 600
	•	Section title: 600
	•	Body text: 400
	•	UI labels / table headings / nav: 500
	•	Small helper text: 400

Type scale

Display 1   48 / 56   weight 700
Display 2   40 / 48   weight 700
H1          32 / 40   weight 700
H2          28 / 36   weight 700
H3          24 / 32   weight 600
H4          20 / 28   weight 600
H5          18 / 26   weight 600
Body L      18 / 30   weight 400
Body M      16 / 26   weight 400
Body S      14 / 22   weight 400
Caption     12 / 18   weight 400
Label       14 / 20   weight 500
Mono S      13 / 20   weight 500

Usage guidance
	•	Keep body text mostly at 16px
	•	Use 14px for dense dashboard labels
	•	Reserve 12px only for metadata/captions
	•	Avoid very light font weights for data-heavy sections

⸻

5. Spacing system

Use an 8pt system.

4px   micro gap
8px   tight spacing
12px  compact spacing
16px  default spacing
24px  comfortable spacing
32px  section spacing
40px  large section spacing
48px  hero / major block spacing
64px  page section spacing
80px  landing hero vertical space

Border radius

6px   inputs, chips
8px   buttons
12px  cards
16px  feature panels
20px  hero cards / modal shells
24px  premium containers

Shadows

Keep subtle, not soft-SaaS-heavy.

Shadow sm:  0 1px 2px rgba(15, 23, 42, 0.06)
Shadow md:  0 6px 18px rgba(15, 23, 42, 0.08)
Shadow lg:  0 14px 32px rgba(15, 23, 42, 0.10)


⸻

6. Layout system

Max widths
	•	Landing content width: 1200px
	•	Reading width for text sections: 720–800px
	•	Dashboard content width: 1400px max
	•	Dense tables and analytics panels: full width with consistent side padding

Grid
	•	12-column grid for marketing pages
	•	12-column or 24-column dashboard grid for analytics-heavy pages

Section rhythm

For public pages:
	•	hero
	•	project summary
	•	features
	•	method/technology
	•	results/demo
	•	team/publications/contact

For app pages:
	•	top nav
	•	sidebar
	•	page header
	•	filter/action row
	•	main content panels
	•	detail drawer/modal

⸻

7. Component theme spec

7.1 Navigation

Top navigation
	•	Background: #0B2545
	•	Text: #FFFFFF
	•	Active item underline or pill: #14B8A6
	•	Hover background: rgba(255,255,255,0.08)

Sidebar
	•	Background: #FFFFFF
	•	Border-right: #E2E8F0
	•	Default text: #475569
	•	Active item bg: #EAF3FF
	•	Active item text: #134074
	•	Active icon: #2F6FED

⸻

7.2 Buttons

Primary button
	•	Background: #2F6FED
	•	Text: #FFFFFF
	•	Hover: #134074
	•	Pressed: #0B2545
	•	Disabled bg: #CBD5E1
	•	Disabled text: #94A3B8

Secondary button
	•	Background: #14B8A6
	•	Text: #FFFFFF
	•	Hover: #0F766E
	•	Pressed: #0C5F58

Tertiary / outline button
	•	Background: #FFFFFF
	•	Border: #CBD5E1
	•	Text: #134074
	•	Hover background: #F1F5F9
	•	Hover border: #94A3B8

Ghost button
	•	Background: transparent
	•	Text: #134074
	•	Hover background: #EAF3FF

Destructive button
	•	Background: #EF4444
	•	Text: #FFFFFF
	•	Hover: #B91C1C

⸻

7.3 Inputs

Text input
	•	Background: #FFFFFF
	•	Border: #CBD5E1
	•	Text: #0F172A
	•	Placeholder: #94A3B8
	•	Focus border: #2F6FED
	•	Focus ring: rgba(47,111,237,0.18)
	•	Error border: #EF4444

Search box
	•	Background: #FFFFFF
	•	Border: #E2E8F0
	•	Left icon: #94A3B8
	•	Active border: #14B8A6

Select / dropdown
	•	Same as text input
	•	Selected item bg: #EAF3FF
	•	Selected item text: #134074

⸻

7.4 Cards and panels

Standard card
	•	Background: #FFFFFF
	•	Border: 1px solid #E2E8F0
	•	Radius: 12px
	•	Shadow: shadow-sm

Elevated analytics card
	•	Background: #FFFFFF
	•	Border: 1px solid #E2E8F0
	•	Radius: 16px
	•	Shadow: shadow-md

Highlight card
	•	Background: #F1F5F9
	•	Left border or top accent: #14B8A6

Research info card
	•	Background: #EAF3FF
	•	Accent icon/background: #134074
	•	Text: #0F172A

⸻

7.5 Tags, badges, chips

Default chip
	•	Background: #F1F5F9
	•	Text: #475569

Active filter chip
	•	Background: #EAF3FF
	•	Text: #134074
	•	Border: #7FB3FF

Success badge
	•	Background: #DCFCE7
	•	Text: #166534

Warning badge
	•	Background: #FEF3C7
	•	Text: #B45309

Error badge
	•	Background: #FEE2E2
	•	Text: #B91C1C

Match-status chip
	•	Confirmed: bg #DDF8F4, text #0F766E
	•	Uncertain: bg #FEF3C7, text #B45309
	•	Lost: bg #FEE2E2, text #B91C1C

⸻

7.6 Tables

Table base
	•	Header background: #F8FAFC
	•	Header text: #475569
	•	Row background: #FFFFFF
	•	Row hover: #F1F5F9
	•	Border: #E2E8F0
	•	Main text: #0F172A
	•	Secondary text: #475569

Selected row
	•	Background: #EAF3FF
	•	Border accent: #2F6FED

Dense scientific/ID table

Use monospace for:
	•	specimen IDs
	•	timestamps
	•	track IDs
	•	detection confidence

⸻

7.7 Alerts and notices

Info panel
	•	Background: #DBEAFE
	•	Border: #3B82F6
	•	Text: #1D4ED8

Success panel
	•	Background: #DCFCE7
	•	Border: #22C55E
	•	Text: #166534

Warning panel
	•	Background: #FEF3C7
	•	Border: #F59E0B
	•	Text: #B45309

Error panel
	•	Background: #FEE2E2
	•	Border: #EF4444
	•	Text: #B91C1C

⸻

7.8 Modals and drawers

Modal
	•	Surface: #FFFFFF
	•	Border: #E2E8F0
	•	Radius: 20px
	•	Shadow: shadow-lg
	•	Overlay: rgba(15, 23, 42, 0.45)

Side drawer
	•	Surface: #FFFFFF
	•	Border-left: #E2E8F0
	•	Overlay: rgba(15, 23, 42, 0.24)

⸻

8. Data visualisation spec

This part matters a lot for the tracker UI.

Chart palette

Use in this order:
	1.	#2F6FED
	2.	#14B8A6
	3.	#F25F5C
	4.	#7FB3FF
	5.	#4D7C0F
	6.	#94A3B8

Chart rules
	•	Grid lines: #E2E8F0
	•	Axes text: #475569
	•	Chart titles: #0F172A
	•	Background: white or #F8FAFC
	•	Use coral only for one emphasis series, not as a dominant default

Tracking overlays

For bounding boxes / identity overlays:
	•	Selected identity: #2F6FED
	•	Stable confirmed identity: #14B8A6
	•	Ambiguous candidate: #F59E0B
	•	Error/lost: #EF4444
	•	Manual review requested: #F25F5C

For overlay labels:
	•	label background: matching state colour
	•	label text: white
	•	use 90–95% opacity for visibility on video

⸻

9. Page-specific guidance

9.1 Landing page

Hero section
	•	Background: white or very soft blue tint
	•	Eyebrow badge: #DDF8F4 with #0F766E text
	•	Main headline: #0F172A
	•	Supporting text: #475569
	•	Primary CTA: blue button
	•	Secondary CTA: outline button
	•	Optional visual accent: subtle marine gradient from #EAF3FF to #DDF8F4

Feature blocks
	•	Alternate between white and #F8FAFC
	•	Use teal icons for tracking/intelligence features
	•	Use blue icons for research/database features

Publications / technical credibility section
	•	Use #F1F5F9 or white
	•	Add restrained borders and clean text-heavy layout
	•	Avoid loud accent colours here

⸻

9.2 Dashboard / tracker interface

Header
	•	Page title: #0F172A
	•	Metadata/subtitle: #475569
	•	Primary action button: blue
	•	Filter pills: slate/blue/teal depending on state

Video + side analytics split
	•	Video container: dark frame with #1E293B
	•	Analytics cards: white
	•	Selected object data panel: #EAF3FF
	•	Comparison/review panel: #F8FAFC

Performance/result views
	•	Use teal for positive system performance
	•	Use coral very selectively for false matches or anomalies
	•	Use amber for confidence issues

⸻

10. Iconography and illustration

Icon style
	•	outline or lightly rounded line icons
	•	medium stroke weight
	•	use a consistent system such as Lucide or Heroicons

Icon colour usage
	•	default icon: #475569
	•	active icon: #2F6FED
	•	success icon: #14B8A6
	•	attention icon: #F25F5C

Illustration guidance

Illustrations should use:
	•	navy outlines
	•	blue/teal fills
	•	very restrained coral highlights
	•	pale seafoam or light blue background blobs

⸻

11. Motion and interaction

Motion style
	•	subtle
	•	purposeful
	•	technical, not playful

Timing
	•	hover transitions: 150–200ms
	•	panel expansion: 220–260ms
	•	modal enter: 240ms
	•	chart highlight: 120–160ms

Easing

Use simple easing like:
	•	ease-out for reveals
	•	ease-in-out for panel movement

Avoid bouncy motion.

⸻

12. Accessibility guidance

Contrast

Aim for:
	•	normal text: minimum 4.5:1
	•	large text: minimum 3:1
	•	UI controls and boundaries clearly visible against white and light slate backgrounds

Practical rules
	•	do not place teal text on white at small sizes unless bold enough and dark enough
	•	prefer #0F766E over #14B8A6 for small text
	•	use #134074 or #0F172A for important text
	•	coral should usually be used as fill or accent, not body text

Focus states

Every interactive element should get:
	•	2px visible focus ring
	•	focus ring colour: rgba(47,111,237,0.28)
	•	focus border: #2F6FED

⸻

13. Light mode token set

:root {
  --bg-page: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-surface-alt: #F1F5F9;

  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --text-inverse: #FFFFFF;

  --border-default: #E2E8F0;
  --border-strong: #CBD5E1;

  --brand-primary-dark: #0B2545;
  --brand-primary: #134074;
  --brand-action: #2F6FED;
  --brand-action-light: #EAF3FF;

  --accent-teal-dark: #0F766E;
  --accent-teal: #14B8A6;
  --accent-teal-light: #DDF8F4;

  --accent-coral: #F25F5C;
  --accent-coral-light: #FFE5E3;

  --success: #22C55E;
  --success-bg: #DCFCE7;
  --warning: #F59E0B;
  --warning-bg: #FEF3C7;
  --error: #EF4444;
  --error-bg: #FEE2E2;
  --info: #3B82F6;
  --info-bg: #DBEAFE;

  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 6px 18px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 14px 32px rgba(15, 23, 42, 0.10);

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
}


⸻

14. Dark mode companion spec

This is worth defining now even if you do not implement it immediately.

Dark surfaces
	•	Page background: #0B1120
	•	Primary surface: #111827
	•	Secondary surface: #1E293B
	•	Border: #334155

Dark typography
	•	Primary text: #F8FAFC
	•	Secondary text: #CBD5E1
	•	Muted text: #94A3B8

Dark accents
	•	Primary action: #60A5FA
	•	Primary hover: #3B82F6
	•	Teal accent: #2DD4BF
	•	Coral accent: #FB7185

Dark mode tokens

[data-theme="dark"] {
  --bg-page: #0B1120;
  --bg-surface: #111827;
  --bg-surface-alt: #1E293B;

  --text-primary: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-muted: #94A3B8;
  --text-inverse: #FFFFFF;

  --border-default: #334155;
  --border-strong: #475569;

  --brand-primary-dark: #0B2545;
  --brand-primary: #60A5FA;
  --brand-action: #60A5FA;
  --brand-action-light: rgba(96, 165, 250, 0.14);

  --accent-teal-dark: #14B8A6;
  --accent-teal: #2DD4BF;
  --accent-teal-light: rgba(45, 212, 191, 0.14);

  --accent-coral: #FB7185;
  --accent-coral-light: rgba(251, 113, 133, 0.14);

  --success: #4ADE80;
  --success-bg: rgba(74, 222, 128, 0.14);
  --warning: #FBBF24;
  --warning-bg: rgba(251, 191, 36, 0.14);
  --error: #F87171;
  --error-bg: rgba(248, 113, 113, 0.14);
  --info: #60A5FA;
  --info-bg: rgba(96, 165, 250, 0.14);
}


⸻

15. Recommended usage ratios

To keep the site balanced:
	•	70% neutrals and white/slate backgrounds
	•	15% navy/brand blue structural use
	•	10% interactive blue
	•	4% teal accent
	•	1% coral accent

That ratio matters. Coral should be rare and intentional.