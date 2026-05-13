---
title: Is Resting Heart Rate King?
publishDate: 2026-05-13
seo:
  image:
    src: ../../assets/images/sleepyBryan.png
    alt: Bryan Johnson looking sleepy
---

![This is what peak performance looks like](../../assets/images/sleepyBryan.png)
*This is what peak performance looks like.*

You may have heard of [Bryan Johnson](https://en.wikipedia.org/wiki/Bryan_Johnson). He's the ex-venture capitalist who doesn't want to die. He made headlines a couple years ago when he [infused his son's plasma](https://www.businessinsider.com/millionaire-bryan-johnson-stops-blood-infusions-young-people-teen-son-2023-7) to help in his quest to slow and reverse his aging (spoiler alert, there were no benefits). He's the most-measured man on Earth, and he doesn't put anything in his body unless it's been scienticially proven to better his health and contribute to longevity. 

Despite having thousands of biomarkers available to him, Bryan has been doing the rounds on various talk shows and podcasts to preach about what he says is the most important health metric of all - [resting heart rate before sleep](https://www.youtube.com/shorts/dKqHjzgClR0). He argues that a lower heart rate before bed results in better sleep. Getting better sleep results in increased willpower and discipline the next day. More discipline means eating healthier and exercising more. An improved diet and working out then results in better sleep, and so on and so forth, resulting in a positive feedback loop. 

Anecdotally, I absolutely agree - I always make better decisions when I've slept well the night before. But I wanted to see if the data backed that up. I've been wearing an Apple watch for five years, and I've been sleeping with my watch on for the past ~18 months. I decided to do some statistical analysis against this hypothesis: *pre-sleep heart rate has a statistically significant negative correlation with sleep quality score - in other words, lower HR in the hour before bed predicts higher sleep quality.* 

### The Analysis

I began by exporting all of my Apple Health data directly from my iPhone, did some work to clean things up and make it ready for analysis, and then finally tested my hypothesis. I did a simple linear regression on my 458 total nights of sleep data comparing HR before bed to sleep score () and found a *p*-value of **0.0003**! That said, when plotting out the negative correlation, I found a correlation coefficient (r-value) of only  **-0.17**, a *very weak* correlation. This means that, at least from from this subset of data, my pre-sleep heart rate explains only about **3%** of the variation in my sleep scores seen here. 

These data supports my hypothesis: the negative correlation and statistical significance confirm that lower pre-sleep heart rate is associated with higher sleep quality, consistent with Johnson's claims and my own anectotal experience. That said, correlation ≠ causation. Even with statistical significance, this doesn't prove that lower heart rate *causes* better sleep; it is surely influenced by a multitude other factors (stress, exercise, caffeine, sleep environment, etc.).

<iframe 
  src="/presleep_hr_chart.html" 
  width="100%" 
  height="620" 
  style="border: none;"
></iframe>

### What's Next

A weak (but real) correlation is still a cool finding. Pre-sleep heart rate *does* predict sleep quality in my data, just not as cleanly as Bryan Johnson might have me believe. The more honest takeaway is that sleep is complicated and no single metric is king.

I'm thinking of doing a multiple regression - throwing in daily step count, active calorie burn, and awake event frequency alongside pre-sleep HR - and see whether heart rate still holds up as a significant predictor when controlled for everything else. Maybe there's a clearer story there.

In the meantime, I'll wear my blue-light filtered glasses and get to bed on time, but I think I'll leave the plasma infusions to Bryan.

---

*Data sourced from my personal Apple Health export. Analysis done in Python using pandas, scipy, and plotly. All code below.*
<details>
<summary>Click to expand code</summary>

```python
#%% IMPORTS
import xml.etree.ElementTree as ET
import pandas as pd
import numpy as np

#%% parse raw XML health data
tree = ET.parse('/Users/admin/Coding/health_project/data/apple_health_export/export.xml')
root = tree.getroot()

METRICS = {
    'HKQuantityTypeIdentifierHeartRate':              'heart_rate',
    'HKQuantityTypeIdentifierStepCount':              'steps',
    'HKQuantityTypeIdentifierActiveEnergyBurned':     'active_cals',
    'HKQuantityTypeIdentifierBasalEnergyBurned':      'resting_cals',
    'HKCategoryTypeIdentifierSleepAnalysis':          'sleep',
}

records = []
for record in root.iter('Record'):
    rtype = record.attrib.get('type')
    if rtype in METRICS:
        records.append({
            'metric':     METRICS[rtype],
            'value':      record.attrib.get('value'),
            'value_raw':  record.attrib.get('value'),
            'unit':       record.attrib.get('unit'),
            'startDate':  record.attrib.get('startDate'),
            'endDate':    record.attrib.get('endDate'),
        })

df = pd.DataFrame(records)

#%% adjusting data types for dates
df['value'] = pd.to_numeric(df['value'], errors='coerce')
df['startDate'] = pd.to_datetime(df['startDate'])  # KEEP TZ
df['endDate']   = pd.to_datetime(df['endDate'])

#%% creating new DataFrames for sleep and heart rate
sleep = df[df['metric'] == 'sleep'].copy()
hr    = df[df['metric'] == 'heart_rate'].copy()

#%% mapping sleep stages
stage_map = {
    'HKCategoryValueSleepAnalysisAsleepCore': 'core',
    'HKCategoryValueSleepAnalysisAsleepDeep': 'deep',
    'HKCategoryValueSleepAnalysisAsleepREM': 'rem',
    'HKCategoryValueSleepAnalysisAsleepUnspecified': 'unspecified',
    'HKCategoryValueSleepAnalysisAwake': 'awake',
    'HKCategoryValueSleepAnalysisInBed': 'in_bed'
}

sleep = sleep[sleep['value_raw'].isin(stage_map.keys())].copy()
sleep['stage'] = sleep['value_raw'].map(stage_map)

#%% sleep duration in minutes
sleep['duration_min'] = (sleep['endDate'] - sleep['startDate']).dt.total_seconds() / 60

#%% consistent sleep date (assign to the date of sleep start, but if start is before noon, assign to previous day)
sleep['sleep_date'] = sleep['startDate'].dt.date
sleep.loc[sleep['startDate'].dt.hour < 12, 'sleep_date'] = (
    sleep['startDate'] - pd.Timedelta(days=1)
).dt.date

#%% getting sleep start time for each night (based on core/deep/rem/unspecified stages)
sleep_start = (
    sleep[sleep['stage'].isin(['core','deep','rem','unspecified'])]
    .groupby('sleep_date')['startDate']
    .min()
    .rename('sleep_start')
)

#%% grouping by night and stage to get total duration per stage, then pivoting to wide format
nightly = (
    sleep.groupby(['sleep_date', 'stage'])['duration_min']
    .sum()
    .unstack(fill_value=0)
    .reset_index()
)

# ensure all columns exist
for col in ['core','deep','rem','unspecified','awake','in_bed']:
    if col not in nightly.columns:
        nightly[col] = 0

# merge sleep start
nightly = nightly.merge(sleep_start, on='sleep_date', how='left')

#%% getting nightly totals and efficiency
nightly['total_sleep_min'] = (
    nightly['core'] +
    nightly['deep'] +
    nightly['rem'] +
    nightly['unspecified']
)

nightly['total_sleep_hr'] = nightly['total_sleep_min'] / 60

nightly['efficiency'] = nightly['total_sleep_min'] / nightly['in_bed']
nightly['efficiency'] = nightly['efficiency'].fillna(0)

#%% FRAGMENTATION
awake_counts = (
    sleep[sleep['stage'] == 'awake']
    .groupby('sleep_date')
    .size()
    .rename('awake_events')
)

nightly = nightly.merge(awake_counts, on='sleep_date', how='left')
nightly['awake_events'] = nightly['awake_events'].fillna(0)

#%%  sorting heart rate data by time for easier processing later
hr = hr.sort_values('startDate')

#%% getting pre-sleep heart rate (average in the hour before sleep start, or nearest prior if not enough data)
pre_sleep_vals = []

for _, row in nightly.iterrows():
    start = row['sleep_start']
    
    if pd.isna(start):
        pre_sleep_vals.append(np.nan)
        continue
    
    window_start = start - pd.Timedelta(hours=1)
    
    hr_window = hr[
        (hr['startDate'] >= window_start) &
        (hr['startDate'] < start)
    ]['value']
    
    # if enough data → use mean
    if len(hr_window) >= 2:
        pre_sleep_vals.append(hr_window.mean())
    else:
        # fallback: nearest HR before sleep
        prior_hr = hr[hr['startDate'] < start].tail(1)['value']
        if len(prior_hr) > 0:
            pre_sleep_vals.append(prior_hr.iloc[0])
        else:
            pre_sleep_vals.append(np.nan)

nightly['pre_sleep_hr'] = pre_sleep_vals

#%% sleep score work
def duration_score(h):
    if 7 <= h <= 9:
        return 40
    elif h < 7:
        return 40 * (h / 7)
    else:
        return 40 * (9 / h)

nightly['duration_score'] = nightly['total_sleep_hr'].apply(duration_score)

nightly['efficiency_score'] = 25 * (nightly['efficiency'] / 0.95).clip(upper=1)

deep_pct = (nightly['deep'] / nightly['total_sleep_min']).fillna(0)
rem_pct  = (nightly['rem'] / nightly['total_sleep_min']).fillna(0)

nightly['composition_score'] = 20 * (
    0.5 * (deep_pct / 0.20).clip(upper=1) +
    0.5 * (rem_pct  / 0.22).clip(upper=1)
)

nightly['fragmentation_score'] = (15 - nightly['awake_events'] * 2).clip(lower=0)

nightly['sleep_score'] = (
    nightly['duration_score'] +
    nightly['efficiency_score'] +
    nightly['composition_score'] +
    nightly['fragmentation_score']
).clip(0, 100)

#%% creating the final dataframe
sleep_df = nightly[[
    'sleep_date',
    'sleep_start',
    'core',
    'deep',
    'rem',
    'unspecified',
    'awake',
    'in_bed',
    'total_sleep_hr',
    'efficiency',
    'awake_events',
    'pre_sleep_hr',
    'sleep_score'
]].sort_values('sleep_date').reset_index(drop=True)

print(sleep_df.head())
# %% limiting data to 2025 onwards to focus on recent trends and ensure better HR coverage
sleep_df = sleep_df[sleep_df['sleep_start'] > '2025-01-01']

#%% checking correlation between pre-sleep heart rate and sleep score
from scipy import stats

x = sleep_df['pre_sleep_hr']
y = sleep_df['sleep_score']

slope, intercept, r, p, _ = stats.linregress(x, y)

sig = '***' if p < 0.001 else ('**' if p < 0.01 else ('*' if p < 0.05 else 'ns'))

print(f"r = {r:.2f}")
print(f"p = {p:.4f}  {sig}")
print(f"n = {len(sleep_df)} nights")
print(f"slope: {slope:.2f} pts per bpm")
# %% graphing out pre-sleep heart rate vs sleep score to see if there's any relationship (should be negative correlation)
import plotly.graph_objects as go
import numpy as np

# Trendline values
m, b = np.polyfit(sleep_df['pre_sleep_hr'], sleep_df['sleep_score'], 1)
x_line = np.linspace(sleep_df['pre_sleep_hr'].min(), sleep_df['pre_sleep_hr'].max(), 100)
y_line = m * x_line + b

fig = go.Figure()

# Scatter points
fig.add_trace(go.Scatter(
    x=sleep_df['pre_sleep_hr'],
    y=sleep_df['sleep_score'],
    mode='markers',
    marker=dict(color='#5A51BD', size=8, opacity=0.6),
    customdata=np.stack([
    sleep_df['sleep_date'].astype(str),
    sleep_df['total_sleep_hr'].round(1)
], axis=1),
hovertemplate=(
    '<b>%{customdata[0]}</b><br>'
    'Sleep score: %{y:.1f}<br>'
    'Pre-sleep HR: %{x:.0f} bpm<br>'
    'Total sleep: %{customdata[1]} hrs'
    '<extra></extra>'
)
))

# Trendline
fig.add_trace(go.Scatter(
    x=x_line,
    y=y_line,
    mode='lines',
    line=dict(color='gray', width=1.5, dash='solid'),
    hoverinfo='skip'
))

fig.update_layout(
    title='Pre-Sleep Heart Rate vs Sleep Quality',
    xaxis_title='Pre-Sleep Heart Rate (bpm)',
    yaxis_title='Sleep Score',
    template='plotly_white',
    showlegend=False,
    width=800,
    height=600,
    hoverlabel=dict(bgcolor='white', font_size=13)
)

fig.show()

fig.write_html(
    'presleep_hr_chart.html',
    include_plotlyjs='cdn',
    full_html=False
)
```
</details>

<details>
<summary>Sleep score calculation</summary>
The sleep score is a composite metric (0-100) derived from nightly sleep data, combining four weighted components:

* Duration Score (max 40 points): Based on total sleep hours (total_sleep_hr). Scores 40 if 7-9 hours; scales linearly below 7 hours or above 9 hours.
* Efficiency Score (max 25 points): 25 × (sleep efficiency / 0.95), where efficiency is total sleep time divided by time in bed. Clipped to a maximum of 25.
* Composition Score (max 20 points): 20 × (0.5 × deep sleep % / 20% + 0.5 × REM sleep % / 22%), with each percentage clipped to 100%.
* Fragmentation Score (max 15 points): 15 - (2 × number of awake events), clipped to a minimum of 0.

The final score sums these components and is clipped between 0 and 100. This is calculated for each night in the nightly DataFrame and stored in **sleep_df['sleep_score']**.
<details>