# TGSRTC Corporate Mobility Planner

A plain HTML, CSS and JavaScript project. No React, Bootstrap, Streamlit, npm or build step is required.

## Open in VS Code

1. Extract this ZIP to a folder.
2. Open the extracted `TGSRTC_Mobility_Planner` folder in VS Code.
3. Install the **Live Server** extension (Ritwick Dey), if you do not already have it.
4. Right-click `index.html` and choose **Open with Live Server**.

You can also open `index.html` directly in a browser, but Live Server is recommended while editing.

## Add or replace bus photographs

Put your own photos in the `images` folder and use these exact filenames:

| Vehicle | Filename |
|---|---|
| Opening / hero background | `hero-bus.jpg` |
| City Ordinary diesel | `city-ordinary.jpg` |
| Green City Ordinary electric | `green-city-ordinary.jpg` |
| Metro Express diesel | `metro-express.jpg` |
| Green Metro Express electric | `green-metro-express.jpg` |

The project already includes the supplied TGSRTC photo as `hero-bus.jpg`, with crops for Green CO and Green ME. Replace these with higher-resolution individual photos whenever available. Keep the filenames the same, or update the image paths in `index.html`.

## Project structure

- `index.html` — page structure and form workflow
- `css/styles.css` — palette, responsive layout, transitions and animations
- `js/app.js` — conditional fields, bus capacities, tariff selection and calculations
- `images/` — local bus photographs

## Current vehicle configuration

| Product | Capacity | 40–79 km | 80 km and above |
|---|---:|---:|---:|
| City Ordinary (CO), diesel | 45 | ₹57/km | ₹53/km |
| Green City Ordinary, electric | 35 | ₹57/km | ₹53/km |
| Metro Express (ME), diesel | 45 | ₹62/km | ₹57/km |
| Green Metro Express, electric | 35 | ₹62/km | ₹57/km |

The Green variants use the same rates as their corresponding CO / ME products, as instructed.

Tariffs are transcribed from the supplied TGSRTC Circular No. 27/2022 dated 17.06.2022. The calculator only applies the listed bands; route distances below 40 km are not assigned an invented rate.

## Important calculation note

Monthly estimate = buses required × route km per bus per day × applicable tariff × operating days per month.

The app currently treats the entered route distance as the billable kilometres per bus per day. Confirm whether the route distance should be one-way or round-trip before using estimates operationally.

The workflow includes routes and kilometres, cost comparison, buses required, cabs potentially avoided and carbon avoided. Carbon is calculated only if the user supplies current cab kilometres per cab per day and verified cab and bus emission factors. The cabs-avoided figure is a seat-equivalent planning indicator, not a guaranteed number of cabs removed.

This is a planning prototype, not a TGSRTC quotation or confirmation of service.


**Opening animation:** The intro in this VS Code build uses the original standalone HTML opening animation, including its original embedded bus photograph, typography, movement, road-line animation and timed exit. The rest of the application remains in separate HTML/CSS/JS files.
