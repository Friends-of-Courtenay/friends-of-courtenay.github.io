---
icon: lucide/pencil-line
---

# Contributing to the website

## The simplest way for those new to git (ask for access)

1. Open the repo on [GitHub](https://github.com/Friends-of-Courtenay/friends-of-courtenay.github.io).
2. Click into the `docs/` folder.
3. Click the page you want to change (for example `about.md` or `index.md`).
4. Click the pencil icon (Edit).
5. Make your change, then use **Preview** to sanity-check the formatting.
6. Scroll down and write a short commit message (example: “Fix typo on About page”).
7. Choose **Commit directly to the `main` branch**, then click **Commit changes**.

In a minute or two, GitHub Actions will rebuild and publish the site. 

## Markdown (why we use it)

The site's content is made with Markdown. If you've ever written a post on reddit or discord, you've already used Markdown! It's meant to be legible in raw text.


=== "Plain text"

    ```markdown
    # My Document Title

    This is an example of **bold text** and *italic text*.

    ## Section Title
    This is a section for lists.

    ### Shopping List
    - Apple
    - Banana
    - Orange

    ### Task List
    1. Learn Markdown basics
    2. Practice writing
    3. Share with friends

    > This is an example of a blockquote. Markdown makes markup simple and elegant.

    This is an [example link to the homepage](https://www.friendsofcourtenay.org/).
    ```

=== "Rendered"

    <h1>My Document Title</h1>

    This is an example of **bold text** and *italic text*.

    <h2>Section Title</h2>

    This is a section for lists.

    <h3>Shopping List</h3>

    - Apple
    - Banana
    - Orange

    <h3>Task List</h3>

    1. Learn Markdown basics
    2. Practice writing
    3. Share with friends

    > This is an example of a blockquote. Markdown makes markup simple and elegant.

    This is an [example link to the homepage](https://www.friendsofcourtenay.org/).

## Tech details and costs

#### The website: (free)
- host: Github Pages (better performance than a VPS)
- software: [Zensical (a static site generator)](https://github.com/zensical/zensical)

#### The domain: (~$10/year)
- friendsofcourtenay.org registered on cloudflare.
- DNS, proxy, firewall, catpcha, etc. managed on cloudflare.

#### Newsletter: (vps: $6 a month, email: under $1/year)
- host: OVH VPS. 
- software: [Sendy (self-hosted newsletter software)](https://sendy.co/)
- email: SES (Simple Email Service) from AWS, enterprise-grade email delivery.
- note: we use a cloudflare worker to communicate between the sites. the code is on cloudflare and not currently in the repo.

#### Signup / appointments form: (free)
- hosted on the same VPS above.
- User email notifications use SES.
- software: I slightly modified easy!appointments to use SES, our fork is kept in a private repo [here](https://github.com/Friends-of-Courtenay/easyappointments).

## Soapbox

### Why a static website? 

Static sites are heavily optimized for speed and SEO. HTML markup is minimal and efficient, making them great for accessibility tools. On the content-creation side, Markdown is designed to be legible in raw text, so it's easier for non-technical users to edit. Beyond that, I wanted something up quickly!

### Why not Wordpress (or Wagtail?)

Wordpress was considered, and in hindsight may have been the better choice for what this project has become, rather than its needs at the time of design. For example, signup-forms, blog-style updates, and WYSIWYG editors are needs that have arisen over time. 

### Why not use more SaaS products and web builders like weebly, mailchimp, jotform, etc.?

I didn't look deeply into any of these due to common bad experiences, such as cost, vendor [lock-in](https://wixmediagroup.com/how-to/can-i-transfer-my-wix-to-another-host/), privacy/security issues, [attacks on the open web](https://ma.tt/2021/04/wix-dirty-tricks/), and my personal pet peeve: [reliability](https://www.websitebuilderexpert.com/news/is-weebly-shutting-down/). 

On the other hand, Google Sites seems decent enough with its ties into Google Forms and such (which reduces the reliability risk of connecting multiple SaaS products) and is likely to be around for a while. It's worth researching what they charge for all the features and "seats" that are necessary, but it's not for me.