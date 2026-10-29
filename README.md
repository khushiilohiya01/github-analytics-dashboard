## DevScope 
GitHub Profile Analytics Dashboard

DevScope is a clean and responsive web application for reviewing public GitHub profiles. It highlights key profile details, repository statistics, language usage, contribution graph display, comparison insights, and an overall profile score based on public activity and visibility.

---

## Features

- Search any public GitHub profile
- View profile insights such as repositories, stars, forks, and followers
- Profile score based on activity, visibility, and repository quality
- Repo activity chart (repos by month of last push, past 12 months)
- Language distribution visualization
- Repository analysis with sorting and filtering
- Recent activity detection based on the latest push to each repository
- Forked repositories are excluded from the analysis
- Best repository recommendation
- Practical improvement suggestions
- Compare two GitHub profiles side by side
- Copy generated summary to clipboard
- Export profile summary as a text file
- Light / Dark mode toggle
- Recent searches stored in local storage
- Fully responsive layout

---

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- GitHub REST API

---

## How to Run Locally

1. Clone the repository and open the folder
2. Open `index.html` in a browser (double-click works), or serve the folder with a static server such as VS Code Live Server

No build step or dependencies are required.

---

## What This Project Does

DevScope helps review public GitHub profiles in a more structured way. Instead of only showing raw GitHub data, it organizes profile information into a cleaner dashboard with:
- profile summary
- score breakdown
- repository insights
- comparison view
- repo activity chart
- practical suggestions for improvement

This makes it useful for portfolio review, internship preparation, and general developer profile analysis

---

## Use Cases
- Evaluate GitHub profiles for internships
- Analyze developer activity and contribution trends
- Compare developers side-by-side
- Improve personal portfolio presentation


---

## Limitations
- Works only with public GitHub profiles
- GitHub API rate limits apply (60 unauthenticated requests per hour; each profile uses 2, a comparison uses 4)
- Only the first 100 repositories of a profile are loaded
- No backend (pure frontend project)
- The activity chart counts each repository once, by its most recent push, so it is not a full commit history

---

## Future Improvements
- More detailed contribution analytics
- GitHub OAuth support
- PDF export
- Improved profile scoring logic
- Better visual comparison insights

---

## Preview
Home Dashboard
![Home Dashboard](assets/home.png)

Analyzed Profile
![Analyzed Profile](assets/profile.png)

Compare Profiles
![Compare Profiles](assets/compare.png)

Dark Mode View
![Dark Mode View](assets/dark.png)