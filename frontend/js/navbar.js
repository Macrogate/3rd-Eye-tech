// // Navbar scroll functionality
// document.addEventListener('DOMContentLoaded', function() {
//     // Get the header element
//     const header = document.querySelector('.header_section');

//     // Function to handle scroll
//     function handleScroll() {
//         if (window.scrollY > 50) {
//             header.classList.add('scrolled');
//         } else {
//             header.classList.remove('scrolled');
//         }
//     }

//     // Add scroll event listener
//     window.addEventListener('scroll', handleScroll);

//     // Check initial scroll position
//     handleScroll();

//     // Handle mobile menu toggle
//     const navbarToggler = document.querySelector('.navbar-toggler');
//     const navbarCollapse = document.querySelector('.navbar-collapse');

//     if (navbarToggler && navbarCollapse) {
//         navbarToggler.addEventListener('click', function() {
//             navbarCollapse.classList.toggle('show');
//         });

//         // Close mobile menu when clicking outside
//         document.addEventListener('click', function(event) {
//             if (!navbarCollapse.contains(event.target) && !navbarToggler.contains(event.target)) {
//                 navbarCollapse.classList.remove('show');
//             }
//         });

//         // Close mobile menu when clicking on a link
//         const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
//         navLinks.forEach(link => {
//             link.addEventListener('click', function() {
//                 navbarCollapse.classList.remove('show');
//             });
//         });
//     }

//     // Add active class to current page link
//     const currentPath = window.location.pathname;
//     const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

//     navLinks.forEach(link => {
//         if (link.getAttribute('href') === currentPath.split('/').pop()) {
//             link.classList.add('active');
//         }
//     });
// }); 





// Navbar scroll and mobile menu functionality
document.addEventListener('DOMContentLoaded', function () {

    const header = document.querySelector('.header_section');
    const navbarToggler = document.querySelector('.navbar-toggler');

    // Select ALL collapse elements because HTML contains duplicates
    const navbarCollapses = document.querySelectorAll('.navbar-collapse');

    // Navbar scroll effect
    function handleScroll() {
        if (header) {
            header.classList.toggle('scrolled', window.scrollY > 50);
        }
    }

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    // Mobile navbar toggle
    if (navbarToggler && navbarCollapses.length) {

        navbarToggler.addEventListener('click', function (event) {
            event.stopPropagation();

            const isOpen = navbarToggler.getAttribute('aria-expanded') === 'true';

            navbarCollapses.forEach(function (collapse) {
                collapse.classList.toggle('show', !isOpen);
            });

            navbarToggler.setAttribute('aria-expanded', !isOpen);
        });

        // Close menu when clicking outside
        document.addEventListener('click', function (event) {

            const clickedInside = Array.from(navbarCollapses).some(
                collapse => collapse.contains(event.target)
            );

            if (!clickedInside && !navbarToggler.contains(event.target)) {
                navbarCollapses.forEach(function (collapse) {
                    collapse.classList.remove('show');
                });

                navbarToggler.setAttribute('aria-expanded', 'false');
            }
        });

        // Close menu after clicking a navigation link
        document.querySelectorAll('.navbar-nav .nav-link').forEach(function (link) {

            link.addEventListener('click', function () {
                navbarCollapses.forEach(function (collapse) {
                    collapse.classList.remove('show');
                });

                navbarToggler.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Active navigation link
    const currentPath = window.location.pathname.split('/').pop();

    document.querySelectorAll('.navbar-nav .nav-link').forEach(function (link) {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

});
