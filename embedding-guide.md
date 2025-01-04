# Taskngo Embedding Guide

Welcome to the Taskngo embedding guide! This document will help you integrate the Taskngo widget into different platforms, such as websites, Notion, and other platforms that support iframe embedding.

---

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Embedding Taskngo on Websites](#2-embedding-taskngo-on-websites)
- [3. Embedding Taskngo on Notion](#3-embedding-taskngo-on-notion)
- [4. Embedding Taskngo on Other Platforms](#4-embedding-taskngo-on-other-platforms)
- [5. Customizing Your Widget](#5-customizing-your-widget)
- [6. Frequently Asked Questions (FAQ)](#6-frequently-asked-questions-faq)
- [7. Support and Feedback](#7-support-and-feedback)

---

## 1. Introduction

Taskngo is a lightweight task management widget that can be easily embedded into various platforms. Whether you want to add it to your website, blog, or Notion page, the process is quick and simple.

This guide will walk you through embedding Taskngo in several environments and offer tips on customizing the widget to fit your needs.

---

## 2. Embedding Taskngo on Websites

You can easily embed the Taskngo widget on any website by using an HTML iframe tag. Here's how to do it:

### Step 1: Get the TaskNGo Link
- https://taskngo.vercel.app

### Step 2: Embed the Widget

Once you have the URL, you can add it to your website using an iframe. Place the following HTML code where you want the widget to appear:

```html
<iframe
    src="https://taskngo.vercel.app"
    width="100%"
    height="500px"
    frameborder="0"
    style="border: none; overflow: hidden;"
></iframe>

Adjust the width and height as needed. For a full-width widget, you can set width="100%". Modify the height according to your design preferences.

##3. Embedding Taskngo on Notion

To embed Taskngo into Notion, follow these steps:

Step 1: Get the Vercel Link
https://taskngo.vercel.app

Step 2: Embed in Notion
Open your Notion page and type /embed.
Paste the URL of your deployed Taskngo widget.

Notion will automatically generate an embedded view of the widget.
Note: You may need to adjust the size in Notion for optimal display. Resize the embedded iframe as per your design needs.

##4. Embedding Taskngo on Other Platforms
If you want to embed Taskngo on other platforms such as WordPress, Ghost, or any other website builder that supports iframes, you can follow the same iframe method.

Step 1: Get the Vercel Link
https://taskngo.vercel.app

Step 2: Embed the Widget
Use the following HTML iframe code for embedding:
<iframe
    src="https://taskngo.vercel.app"
    width="100%"
    height="500px"
    frameborder="0"
    style="border: none; overflow: hidden;"
></iframe>

Adjust the width and height to fit your platform’s requirements. This method should work for any platform that supports iframes.

5. Customizing Your Widget
You can further customize the appearance and behavior of the Taskngo widget. Below are some tips:

CSS Customization: Modify the CSS file to change colors, fonts, button styles, and more.

Widget Size: Adjust the iframe’s width and height to control the size of the widget on your page.

Responsive Design: The widget is built to be responsive, but you can tweak it further using CSS media queries for specific breakpoints or devices.

For example, to change the background color of the widget:

.widget {
    background-color: #f0f0f0;
}

You can also adjust styles based on screen sizes using media queries:

@media (max-width: 768px) {
    .widget {
        width: 100%;
        height: 400px;
    }
}

6. Frequently Asked Questions (FAQ)

Q1: How do I change the size of the widget?
You can change the widget size by modifying the width and height attributes in the iframe tag. For instance:

<iframe
    src="https://your-project-name.vercel.app"
    width="800px"
    height="600px"
    frameborder="0"
    style="border: none; overflow: hidden;"
></iframe>

Q2: Can I embed the widget on multiple websites?
Yes, you can embed the Taskngo widget on any number of websites. Simply use the iframe code on each page where you want the widget to appear.

Q3: What if the widget doesn’t fit properly?
If the widget doesn’t fit on your page, you can adjust the width and height of the iframe tag to better suit your layout. You can also customize the widget's CSS for further styling adjustments.

7. Support and Feedback
If you need further assistance or have any questions, feel free to reach out! You can:

Open an issue in our GitHub repository.
Leave feedback or suggestions for future improvements.
Thank you for using Taskngo! We hope this guide helps you get the widget up and running smoothly on your website or platform.