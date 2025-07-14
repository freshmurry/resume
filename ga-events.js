// Google Analytics Enhanced Events
document.addEventListener('DOMContentLoaded', function() {
  // Track page views
  gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_referrer: document.referrer
  });

  // Track scroll depth
  let maxScroll = 0;
  window.addEventListener('scroll', function() {
    const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
      if (scrollPercent >= 25 && maxScroll === 25) {
        gtag('event', 'scroll', { scroll_depth: '25%' });
      } else if (scrollPercent >= 50 && maxScroll === 50) {
        gtag('event', 'scroll', { scroll_depth: '50%' });
      } else if (scrollPercent >= 75 && maxScroll === 75) {
        gtag('event', 'scroll', { scroll_depth: '75%' });
      } else if (scrollPercent >= 90 && maxScroll === 90) {
        gtag('event', 'scroll', { scroll_depth: '90%' });
      }
    }
  });

  // Track time on page
  let startTime = Date.now();
  window.addEventListener('beforeunload', function() {
    const timeOnPage = Math.round((Date.now() - startTime) / 1000);
    gtag('event', 'timing_complete', {
      name: 'page_view_time',
      value: timeOnPage
    });
  });

  // Track external link clicks
  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    link.addEventListener('click', function() {
      gtag('event', 'click', {
        event_category: 'external_link',
        event_label: this.href,
        value: 1
      });
    });
  });

  // Track resume download
  const resumeLink = document.querySelector('a[href*="Proposal-Manager-Resume"]');
  if (resumeLink) {
    resumeLink.addEventListener('click', function() {
      gtag('event', 'download', {
        event_category: 'resume',
        event_label: 'resume_download',
        value: 1
      });
    });
  }

  // Track email clicks
  document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
    link.addEventListener('click', function() {
      gtag('event', 'click', {
        event_category: 'contact',
        event_label: 'email_click',
        value: 1
      });
    });
  });
}); 