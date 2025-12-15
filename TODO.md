# Project TODO

## High Priority

- [x] Stop showing "Restricted" streets as "PAID" on the map. we need to filter them out.
- [x] Add multilingual support, support top 8 languages most used worldwide, With multi language support and cities coverage data, can we generate seperate URLS for each language/city? That would be good for SEO.
- [x] Implement analytics and SEO best practices (Meta tags, sitemap, etc.)

## Backlog

## Completed

- [x] When user is not in a coverage zone, add a button to the banner for user to request.
- [x] Provide an automation implementation to run at certain time of everyday to seed the city if request count > certain amount.
- [x] UI fix: now we have parking lots, the total results count on the page is incorrect (paid parking : x blocks y spots)
- [x] Add a user report feature, when user selects a meter/street, they can mark it as valid(verifying the free/paid status) or invalid (reporting a false positive/negative). If a false positive/negative is reported, the user can provide a reason with checking from a list. For example, user clicked on a meter/street that is paid, there's a button called "report", which opens up and gives them three options(expand if you find necessary): Free/Paid/No-parking, radio-button style or selectable list(single select), default checked is the one that matches the current status of the meter/street. If user selects a diffrent Option(i.e Free for a paid zone, or paid for a free zone), They can additionally check a reason, we need to list common reasons, such as select free->check paid->reason(There is a meter)->submit; Or, select free-> check non-parking->reason(Requires permit)->submit. Record the user's IP address and location, and send it to the server. And set a few values (in the database or elsewhere) for a threshold of reports, after the threshold we don't display the meter/street as original status, but display a verified/corrected status. Such as Free -> Verified Free, Paid -> Reported as free, Free -> Reported as paid. But we still display all locations just add extra information from user base feedback.
- [x] What about parking lots? do you have thoughts and plans to support parking lots? There should be free to park, free for a limited time and paid parking lots. Can we gather and support that information?
- [x] Look into table parking_zones, is it not used. what is it designed for?
