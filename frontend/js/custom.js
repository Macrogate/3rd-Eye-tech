// to get current year
function getYear() {
    var currentDate = new Date();
    var currentYear = currentDate.getFullYear();
    document.querySelector("#displayYear").innerHTML = currentYear;
}

getYear();

// nice select
$(document).ready(function () {
    $('select').niceSelect();
});

// date picker
$(function () {
    $("#inputDate").datepicker({
        autoclose: true,
        todayHighlight: true
    }).datepicker('update', new Date());
});

// owl carousel slider js
$('.team_carousel').owlCarousel({
    loop: true,
    margin: 15,
    dots: true,
    autoplay: true,
    navText: [
        '<i class="fa fa-angle-left" aria-hidden="true"></i>',
        '<i class="fa fa-angle-right" aria-hidden="true"></i>'
    ],
    autoplayHoverPause: true,
    responsive: {
        0: {
            items: 1,
            margin: 0
        },
        576: {
            items: 2,
        },
        992: {
            items: 3
        }
    }
})

// Sticky Navbar
$(window).scroll(function() {
    if ($(this).scrollTop() > 50) {
        $('.header_section').addClass('scrolled');
    } else {
        $('.header_section').removeClass('scrolled');
    }
});

// Smooth scrolling for anchor links
$('a[href*="#"]').not('[href="#"]').not('[href="#0"]').click(function(event) {
    if (
        location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && 
        location.hostname == this.hostname
    ) {
        var target = $(this.hash);
        target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
        if (target.length) {
            event.preventDefault();
            $('html, body').animate({
                scrollTop: target.offset().top - 80
            }, 1000);
        }
    }
});

// Close mobile menu when clicking outside
$(document).click(function(event) {
    var clickover = $(event.target);
    var opened = $(".navbar-collapse").hasClass("show");
    if (opened === true && !clickover.hasClass("navbar-toggler")) {
        $(".navbar-toggler").click();
    }
});