import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const LandingPage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    type: "",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Inject Google Fonts and Tailwind CDN
  useEffect(() => {
    const link1 = document.createElement("link");
    link1.rel = "preconnect";
    link1.href = "https://fonts.googleapis.com";
    document.head.appendChild(link1);

    const link2 = document.createElement("link");
    link2.rel = "preconnect";
    link2.href = "https://fonts.gstatic.com";
    link2.crossOrigin = "anonymous";
    document.head.appendChild(link2);

    const link3 = document.createElement("link");
    link3.href = "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,600;0,6..96,700;1,6..96,300;1,6..96,400;1,6..96,600&family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600&display=swap";
    link3.rel = "stylesheet";
    document.head.appendChild(link3);

    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);

    // Tailwind Config
    script.onload = () => {
      window.tailwind.config = {
        theme: {
          extend: {
            colors: {
              maroon:  '#5C1328',
              gold:    '#B8960C',
              goldlt:  '#D4AF37',
              ink:     '#0F0F0F',
              ash:     '#2A2A2A',
              ivory:   '#F8F4EE',
              parchment: '#EDE8DF',
              stone:   '#8A8478',
            },
            fontFamily: {
              display: ['"Bodoni Moda"','Georgia','serif'],
              serif:   ['"DM Serif Display"','Georgia','serif'],
              body:    ['Outfit','sans-serif'],
            }
          }
        }
      };
    };

    // Scroll reveal observer
    const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { 
          e.target.classList.add('up'); 
          io.unobserve(e.target); 
        }
      });
    }, { threshold: 0.08 });
    revealEls.forEach(el => io.observe(el));

    // Navbar shadow on scroll
    const handleScroll = () => {
      const nb = document.getElementById('navbar');
      if (nb) {
        nb.classList.toggle('shadow-[0_4px_24px_rgba(0,0,0,0.07)]', window.scrollY > 60);
      }
      
      const heroImg = document.getElementById('hero-img');
      if (heroImg) {
        heroImg.style.transform = `translateY(${window.scrollY * 0.25}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      document.head.removeChild(link1);
      document.head.removeChild(link2);
      document.head.removeChild(link3);
      document.head.removeChild(script);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.type || !formData.message) {
      toast.error("Please fill all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.post("/enquiry", formData);
      if (data.success) {
        toast.success("Enquiry submitted successfully!");
        setFormData({ firstName: "", lastName: "", email: "", type: "", message: "" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit enquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="font-body bg-ivory text-ink antialiased overflow-x-hidden relative">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --maroon: #5C1328;
          --gold:   #B8960C;
          --goldlt: #D4AF37;
          --ink:    #0F0F0F;
          --ivory:  #F8F4EE;
          --parchment: #EDE8DF;
        }

        /* noise texture overlay */
        .landing-noise::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 9999;
          opacity: 0.45;
        }

        /* Gold gradient text */
        .text-gold-grad {
          background: linear-gradient(135deg, #B8960C 0%, #D4AF37 50%, #B8960C 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Reveal animation */
        .reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.85s cubic-bezier(0.22,1,0.36,1), transform 0.85s cubic-bezier(0.22,1,0.36,1);
        }
        .reveal.up { opacity: 1; transform: translateY(0); }
        .reveal-left { opacity: 0; transform: translateX(-40px); transition: opacity 0.85s cubic-bezier(0.22,1,0.36,1), transform 0.85s cubic-bezier(0.22,1,0.36,1); }
        .reveal-left.up { opacity: 1; transform: translateX(0); }
        .reveal-right { opacity: 0; transform: translateX(40px); transition: opacity 0.85s cubic-bezier(0.22,1,0.36,1), transform 0.85s cubic-bezier(0.22,1,0.36,1); }
        .reveal-right.up { opacity: 1; transform: translateX(0); }

        /* Underline hover */
        .ul-hover {
          position: relative;
          display: inline-block;
        }
        .ul-hover::after {
          content: '';
          position: absolute;
          left: 0; bottom: -2px;
          width: 100%; height: 1px;
          background: var(--gold);
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
        }
        .ul-hover:hover::after { transform: scaleX(1); transform-origin: left; }

        /* Nav link */
        .nav-anchor {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #0F0F0F;
          transition: color 0.25s;
          position: relative;
        }
        .nav-anchor::after {
          content: '';
          position: absolute;
          bottom: -3px; left: 0;
          width: 0; height: 1px;
          background: var(--maroon);
          transition: width 0.3s ease;
        }
        .nav-anchor:hover { color: var(--maroon); }
        .nav-anchor:hover::after { width: 100%; }

        /* Dropdown */
        .ddwrap { position: relative; }
        .ddmenu {
          display: none;
          position: absolute;
          top: calc(100% + 12px);
          left: -14px;
          min-width: 230px;
          background: #fff;
          border-top: 2px solid var(--maroon);
          box-shadow: 0 24px 64px rgba(0,0,0,0.12);
          z-index: 100;
        }
        .ddwrap:hover .ddmenu { display: block; }
        .ddmenu a {
          display: block;
          padding: 11px 18px;
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #2A2A2A;
          border-bottom: 1px solid #F0EDE8;
          transition: background 0.2s, color 0.2s;
        }
        .ddmenu a:hover { background: var(--ivory); color: var(--maroon); }

        /* Hero */
        .hero-overlay {
          background: linear-gradient(
            to bottom,
            rgba(15,15,15,0.12) 0%,
            rgba(15,15,15,0.38) 40%,
            rgba(15,15,15,0.78) 100%
          );
        }

        /* Program card */
        .prog-card { position: relative; overflow: hidden; }
        .prog-card img { transition: transform 0.9s cubic-bezier(0.22,1,0.36,1); }
        .prog-card:hover img { transform: scale(1.09); }
        .prog-shade {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(92,19,40,0.88) 0%, transparent 55%);
          transition: opacity 0.5s;
        }
        .prog-card:hover .prog-shade { opacity: 0.95; }
        .prog-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px; }

        /* Feature glass card */
        .glass-card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* Scroll line */
        .scroll-bar { animation: scrollAnim 2s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes scrollAnim {
          0%   { transform: scaleY(0); transform-origin: top; opacity:1; }
          45%  { transform: scaleY(1); transform-origin: top; opacity:1; }
          55%  { transform: scaleY(1); transform-origin: bottom; opacity:1; }
          100% { transform: scaleY(0); transform-origin: bottom; opacity:0; }
        }

        /* Gold divider line */
        .gold-line {
          width: 48px; height: 1.5px;
          background: linear-gradient(90deg, var(--gold), var(--goldlt));
          display: block;
        }

        /* Testimonial */
        .testi-card { border-left: 2px solid var(--gold); }

        /* Button styles */
        .btn-gold {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #B8960C, #D4AF37);
          color: #0F0F0F;
          padding: 14px 32px;
          display: inline-block;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .btn-gold::before {
          content: '';
          position: absolute;
          inset: 0;
          background: #0F0F0F;
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
          z-index: 0;
        }
        .btn-gold:hover::before { transform: scaleX(1); transform-origin: left; }
        .btn-gold:hover { color: #D4AF37; }
        .btn-gold span { position: relative; z-index: 1; }

        .btn-outline-white {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          border: 1px solid rgba(255,255,255,0.5);
          color: #fff;
          padding: 14px 32px;
          display: inline-block;
          transition: all 0.35s ease;
        }
        .btn-outline-white:hover { background: #fff; color: #0F0F0F; }

        .btn-maroon {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          background: var(--maroon);
          color: #fff;
          padding: 14px 32px;
          display: inline-block;
          transition: all 0.3s;
        }
        .btn-maroon:hover { background: var(--ink); }

        /* Timeline */
        .timeline-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: var(--gold);
          flex-shrink: 0;
          margin-top: 5px;
        }

        /* App feature icon wrapper */
        .feat-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: rgba(184,150,12,0.12);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* Grain on dark sections */
        .grain-dark { position: relative; }
        .grain-dark::after {
          content: '';
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.05'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }

        /* Floating badge */
        .float-badge {
          animation: floatBadge 3.5s ease-in-out infinite;
        }
        @keyframes floatBadge {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }

        /* Image hover zoom */
        .img-zoom img { transition: transform 0.7s cubic-bezier(0.22,1,0.36,1); }
        .img-zoom:hover img { transform: scale(1.06); }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}} />

      <div className="landing-noise"></div>

      {/* ============================================================
           TOP BAR
      ============================================================ */}
      <div className="bg-maroon text-white relative z-[60]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
          <span className="hidden md:flex items-center gap-2 font-body text-[9px] tracking-[0.22em] uppercase text-white/50">
            <span className="text-goldlt">●</span>
            &nbsp;Admissions Open — Academic Year 2081/82 B.S.
          </span>
          <div className="flex gap-5 mx-auto md:mx-0">
            <a href="#" className="font-body text-[9px] tracking-[0.18em] uppercase text-white/60 hover:text-goldlt transition-colors">Key Dates</a>
            <span className="text-white/20">|</span>
            <a href="#" className="font-body text-[9px] tracking-[0.18em] uppercase text-white/60 hover:text-goldlt transition-colors">Admissions</a>
            <span className="text-white/20">|</span>
            <Link to="/login" className="font-body text-[9px] tracking-[0.18em] uppercase text-goldlt font-semibold hover:text-white transition-colors">Apply Now →</Link>
          </div>
        </div>
      </div>

      {/* ============================================================
           NAVIGATION
      ============================================================ */}
      <nav id="navbar" className="sticky top-0 z-50 bg-ivory/96 backdrop-blur-md border-b border-parchment transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3.5 group flex-shrink-0">
              <div className="relative w-12 h-12 rounded-full bg-maroon shadow-md flex items-center justify-center group-hover:shadow-lg transition-shadow duration-300">
                <span className="font-display text-2xl font-bold text-white leading-none" style={{letterSpacing:"-1px"}}>स</span>
                <div className="absolute inset-0 rounded-full border border-goldlt/30 group-hover:border-goldlt/60 transition-colors duration-300"></div>
              </div>
              <div>
                <div className="font-display text-[15px] font-semibold tracking-wide text-ink leading-none">Saraswati</div>
                <div className="font-body text-[8.5px] tracking-[0.22em] uppercase text-stone leading-none mt-1">Boarding School</div>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              <a href="#about" className="nav-anchor">About</a>

              <div className="ddwrap">
                <button className="nav-anchor flex items-center gap-1 bg-transparent border-0 cursor-pointer">
                  Classes
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div className="ddmenu">
                  <a href="#">Primary — Class 1–5</a>
                  <a href="#">Middle School — Class 6–8</a>
                  <a href="#">Secondary — Class 9–10</a>
                  <a href="#">Boarding &amp; Hostel Life</a>
                </div>
              </div>

              <a href="#platform" className="nav-anchor">Our Platform</a>
              <a href="#news" className="nav-anchor">News &amp; Events</a>
              <a href="#contact" className="nav-anchor">Contact</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-2.5">
              <Link to="/login"
                 className="font-body text-[9.5px] tracking-[0.2em] uppercase border border-maroon text-maroon px-5 py-2.5 hover:bg-maroon hover:text-white transition-all duration-300 leading-none">
                Login
              </Link>
              <Link to="/login"
                 className="btn-gold leading-none py-[10px] px-5 text-[9.5px]"><span>Apply Now</span>
              </Link>
            </div>

            {/* Hamburger */}
            <button 
              id="ham-btn" 
              className="lg:hidden flex flex-col justify-center gap-[5px] p-2 ml-2" 
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              <span className={`block w-[22px] h-[1.5px] bg-ink transition-all ${menuOpen ? 'translate-y-[6.5px] rotate-45' : ''}`}></span>
              <span className={`block w-[22px] h-[1.5px] bg-ink transition-all ${menuOpen ? 'opacity-0 scale-x-0' : ''}`}></span>
              <span className={`block w-[14px] h-[1.5px] bg-ink transition-all ${menuOpen ? 'w-[22px] -translate-y-[6.5px] -rotate-45' : ''}`}></span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div id="mob-menu" className={`lg:hidden bg-ivory border-t border-parchment overflow-hidden transition-all duration-500 ${menuOpen ? 'max-height-[700px] opacity-100 py-6' : 'max-h-0 opacity-0'}`}>
          <div className="px-6 flex flex-col gap-5">
            <a href="#about" className="nav-anchor" onClick={() => setMenuOpen(false)}>About</a>
            <a href="#classes" className="nav-anchor" onClick={() => setMenuOpen(false)}>Classes</a>
            <a href="#platform" className="nav-anchor" onClick={() => setMenuOpen(false)}>Our Platform</a>
            <a href="#news" className="nav-anchor" onClick={() => setMenuOpen(false)}>News &amp; Events</a>
            <a href="#contact" className="nav-anchor" onClick={() => setMenuOpen(false)}>Contact</a>
            <div className="flex gap-3 pt-4 border-t border-parchment">
              <Link to="/login" className="flex-1 text-center font-body text-[9px] tracking-[0.18em] uppercase border border-maroon text-maroon py-3 hover:bg-maroon hover:text-white transition-all">Login</Link>
              <Link to="/login" className="flex-1 text-center btn-gold py-3"><span>Apply Now</span></Link>
            </div>
          </div>
        </div>
      </nav>


      {/* ============================================================
           HERO
      ============================================================ */}
      <section className="relative h-screen min-h-[680px] overflow-hidden">

        {/* Background */}
        <div className="absolute inset-0">
          <img
            id="hero-img"
            src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1920&q=90&auto=format&fit=crop"
            alt="Saraswati Boarding School"
            className="hero-img w-full h-[115%] object-cover -top-[7.5%] absolute"
          />
          <div className="hero-overlay absolute inset-0"></div>
          {/* Gold diagonal accent */}
          <div className="absolute bottom-0 left-0 w-full h-1.5" style={{background: "linear-gradient(90deg, #B8960C 0%, #D4AF37 50%, transparent 100%)"}}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end px-6 sm:px-14 lg:px-24 pb-20 sm:pb-28 max-w-7xl mx-auto">

          <div className="mb-5 flex items-center gap-4">
            <span className="gold-line"></span>
            <span className="font-body text-[9px] tracking-[0.3em] uppercase text-goldlt opacity-0" style={{animation: "fadeSlideUp 0.8s 0.3s ease forwards"}}>
              Est. 2045 B.S. &nbsp;·&nbsp; Classes 1 – 10
            </span>
          </div>

          <h1 className="font-display text-white leading-[0.9] mb-6 opacity-0" style={{animation: "fadeSlideUp 0.9s 0.5s ease forwards"}}>
            <span className="block text-5xl sm:text-7xl lg:text-[105px] font-bold">Saraswati</span>
            <span className="block text-3xl sm:text-4xl lg:text-5xl italic font-light tracking-wider text-white/80 mt-2 pl-1">Boarding School</span>
          </h1>

          <p className="font-body text-white/55 text-xs sm:text-sm max-w-md leading-[1.85] mb-10 opacity-0" style={{animation: "fadeSlideUp 0.9s 0.75s ease forwards"}}>
            A premier residential institution nurturing young minds from Class 1 to 10. Excellence in academics, character, and co-curricular development — with a custom school web app built exclusively for us by <span className="text-goldlt">SikshyaSanjal</span>.
          </p>

          <div className="flex flex-wrap gap-3 opacity-0" style={{animation: "fadeSlideUp 0.9s 0.95s ease forwards"}}>
            <a href="#classes" className="btn-gold"><span>Explore Classes</span></a>
            <a href="#platform" className="btn-outline-white">Our Digital Platform</a>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 right-10 hidden lg:flex flex-col items-center gap-3 z-10">
          <div className="w-px h-20 bg-white/15 relative overflow-hidden">
            <div className="scroll-bar absolute inset-0 bg-goldlt/80"></div>
          </div>
          <span className="font-body text-white/30 text-[8px] tracking-[0.35em] uppercase" style={{writingMode:"vertical-rl", transform:"rotate(180deg)"}}>Scroll</span>
        </div>

        {/* Floating badge */}
        <div className="float-badge absolute top-[38%] right-10 lg:right-20 hidden xl:flex flex-col items-center z-10">
          <div className="w-24 h-24 rounded-full border border-goldlt/40 flex flex-col items-center justify-center text-center p-3" style={{background: "rgba(15,15,15,0.5)", backdropFilter: "blur(8px)"}}>
            <span className="font-display text-2xl font-bold text-goldlt leading-none">35+</span>
            <span className="font-body text-[8px] tracking-[0.15em] uppercase text-white/50 mt-1">Years of<br/>Excellence</span>
          </div>
        </div>
      </section>


      {/* ============================================================
           CLASS GROUPS
      ============================================================ */}
      <section id="classes" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-16 reveal">
            <span className="gold-line mx-auto mb-5"></span>
            <p className="font-body text-[9px] tracking-[0.28em] uppercase text-stone mb-3">Academic Programs</p>
            <h2 className="font-serif text-4xl sm:text-5xl text-ink">The <em>Three Levels of Schools</em></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-parchment">

            {/* Primary */}
            <div className="prog-card group cursor-pointer border-b md:border-b-0 md:border-r border-parchment">
              <div className="relative h-80 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=700&q=80&auto=format&fit=crop" alt="Primary School" className="w-full h-full object-cover"/>
                <div className="prog-shade"></div>
                <div className="prog-content">
                  <span className="font-body text-[8px] tracking-[0.22em] uppercase text-goldlt bg-ink/60 px-2 py-1 backdrop-blur-sm">Class 1 – 5</span>
                  <h3 className="font-display text-white text-2xl mt-3 leading-tight">Primary Level<br/>School</h3>
                </div>
              </div>
              <div className="p-7">
                <p className="font-body text-[13px] text-stone leading-[1.85] mb-5">Foundational learning through play-based, inquiry-driven teaching. English, Nepali, Maths, Science, and Social Studies with Montessori-influenced methods.</p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 font-body text-[11px] text-stone"><span className="w-1 h-1 rounded-full bg-goldlt flex-shrink-0"></span>Morning assembly &amp; prayer</li>
                  <li className="flex items-center gap-2 font-body text-[11px] text-stone"><span className="w-1 h-1 rounded-full bg-goldlt flex-shrink-0"></span>Arts, music &amp; physical education</li>
                  <li className="flex items-center gap-2 font-body text-[11px] text-stone"><span className="w-1 h-1 rounded-full bg-goldlt flex-shrink-0"></span>Supervised boarding &amp; hostel care</li>
                </ul>
                <a href="#" className="ul-hover font-body text-[9px] tracking-[0.18em] uppercase text-maroon hover:text-ink transition-colors">Learn More</a>
              </div>
            </div>

            {/* Middle */}
            <div className="prog-card group cursor-pointer border-b md:border-b-0 md:border-r border-parchment">
              <div className="relative h-80 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=700&q=80&auto=format&fit=crop" alt="Middle School" className="w-full h-full object-cover"/>
                <div className="prog-shade"></div>
                <div className="prog-content">
                  <span className="font-body text-[8px] tracking-[0.22em] uppercase text-goldlt bg-ink/60 px-2 py-1 backdrop-blur-sm">Class 6 – 8</span>
                  <h3 className="font-display text-white text-2xl mt-3 leading-tight">Middle Level<br/>School</h3>
                </div>
              </div>
              <div className="p-7">
                <p className="font-body text-[13px] text-stone leading-[1.85] mb-5">A bridge between childhood and adolescence. Advanced academics with leadership programmes, STEM labs, debate clubs, and structured competitive exposure.</p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 font-body text-[11px] text-stone"><span className="w-1 h-1 rounded-full bg-goldlt flex-shrink-0"></span>STEM &amp; computer lab access</li>
                  <li className="flex items-center gap-2 font-body text-[11px] text-stone"><span className="w-1 h-1 rounded-full bg-goldlt flex-shrink-0"></span>Leadership &amp; debate programs</li>
                  <li className="flex items-center gap-2 font-body text-[11px] text-stone"><span className="w-1 h-1 rounded-full bg-goldlt flex-shrink-0"></span>Weekend residential activities</li>
                </ul>
                <a href="#" className="ul-hover font-body text-[9px] tracking-[0.18em] uppercase text-maroon hover:text-ink transition-colors">Learn More</a>
              </div>
            </div>

            {/* Secondary */}
            <div className="prog-card group cursor-pointer">
              <div className="relative h-80 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=700&q=80&auto=format&fit=crop" alt="Secondary School" className="w-full h-full object-cover"/>
                <div className="prog-shade"></div>
                <div className="prog-content">
                  <span className="font-body text-[8px] tracking-[0.22em] uppercase text-goldlt bg-ink/60 px-2 py-1 backdrop-blur-sm">Class 9 – 10</span>
                  <h3 className="font-display text-white text-2xl mt-3 leading-tight">Secondary Level<br/>School</h3>
                </div>
              </div>
              <div className="p-7">
                <p className="font-body text-[13px] text-stone leading-[1.85] mb-5">NEB-aligned SEE preparation with focused academics, career counselling, mock examinations, and mentorship by senior faculty for board excellence.</p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 font-body text-[11px] text-stone"><span className="w-1 h-1 rounded-full bg-goldlt flex-shrink-0"></span>SEE &amp; NEB board preparation</li>
                  <li className="flex items-center gap-2 font-body text-[11px] text-stone"><span className="w-1 h-1 rounded-full bg-goldlt flex-shrink-0"></span>Career guidance &amp; counselling</li>
                  <li className="flex items-center gap-2 font-body text-[11px] text-stone"><span className="w-1 h-1 rounded-full bg-goldlt flex-shrink-0"></span>Mock exams &amp; study halls</li>
                </ul>
                <a href="#" className="ul-hover font-body text-[9px] tracking-[0.18em] uppercase text-maroon hover:text-ink transition-colors">Learn More</a>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ============================================================
           ABOUT
      ============================================================ */}
      <section id="about" className="py-28 bg-ivory overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">

            {/* Images */}
            <div className="reveal-left relative">
              <div className="grid grid-cols-2 gap-3">
                <div className="img-zoom overflow-hidden row-span-2">
                  <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&q=85&auto=format&fit=crop" alt="Students" className="w-full h-[380px] object-cover"/>
                </div>
                <div className="img-zoom overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&q=85&auto=format&fit=crop" alt="Classroom" className="w-full h-[182px] object-cover"/>
                </div>
                <div className="img-zoom overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=85&auto=format&fit=crop" alt="Library" className="w-full h-[182px] object-cover"/>
                </div>
              </div>
              {/* Gold frame accent */}
              <div className="absolute -bottom-6 -left-6 w-40 h-40 border border-goldlt/40 -z-0 pointer-events-none"></div>
              {/* Label badge */}
              <div className="absolute -top-4 -right-4 bg-maroon text-white px-5 py-4 text-center shadow-lg z-10">
                <div className="font-display text-3xl font-bold text-goldlt leading-none">1,200<span className="text-xl">+</span></div>
                <div className="font-body text-[8px] tracking-[0.18em] uppercase text-white/60 mt-1">Students</div>
              </div>
            </div>

            {/* Text */}
            <div className="reveal-right">
              <span className="gold-line mb-5"></span>
              <p className="font-body text-[9px] tracking-[0.28em] uppercase text-stone mb-4">Our Story</p>
              <h2 className="font-serif text-4xl sm:text-5xl text-ink leading-tight mb-6">
                A Legacy of<br/><em>Holistic Excellence</em>
              </h2>
              <p className="font-body text-[13.5px] text-stone leading-[1.9] mb-4">
                Founded in 2045 B.S. and named after the goddess of knowledge, Saraswati Boarding School has been nurturing young minds for over three decades. Our residential model goes beyond academics — we shape character, discipline, and lifelong values within a caring, structured community.
              </p>
              <p className="font-body text-[13.5px] text-stone leading-[1.9] mb-10">
                With experienced faculty, modern infrastructure, and a curriculum aligned with Nepal's national standards, we prepare students from Class 1 to 10 for a future of purpose and achievement. Our school management web app — designed exclusively for us by <strong className="text-maroon font-medium">SikshyaSanjal</strong> — keeps parents, teachers, and administration seamlessly connected every step of the way.
              </p>

              {/* Timeline */}
              <div className="space-y-5 mb-10">
                <div className="flex gap-4">
                  <div className="timeline-dot mt-1.5"></div>
                  <div>
                    <div className="font-body text-[10px] tracking-[0.18em] uppercase text-maroon mb-0.5">2045 B.S.</div>
                    <div className="font-body text-[12.5px] text-ink">Saraswati Boarding School founded with 120 students</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="timeline-dot mt-1.5"></div>
                  <div>
                    <div className="font-body text-[10px] tracking-[0.18em] uppercase text-maroon mb-0.5">2060 B.S.</div>
                    <div className="font-body text-[12.5px] text-ink">New hostel block &amp; science laboratory inaugurated</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="timeline-dot mt-1.5"></div>
                  <div>
                    <div className="font-body text-[10px] tracking-[0.18em] uppercase text-maroon mb-0.5">2080 B.S.</div>
                    <div className="font-body text-[12.5px] text-ink">SikshyaSanjal delivers a custom-built school web app — our own dedicated digital platform</div>
                  </div>
                </div>
              </div>

              <a href="#" className="ul-hover font-body text-[9px] tracking-[0.2em] uppercase text-maroon hover:text-ink transition-colors">Discover Our Full History</a>
            </div>

          </div>
        </div>
      </section>


      {/* ============================================================
           WHY CHOOSE US  (3 pillars)
      ============================================================ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-16 reveal">
            <span className="gold-line mx-auto mb-5"></span>
            <p className="font-body text-[9px] tracking-[0.28em] uppercase text-stone mb-3">The Saraswati Difference</p>
            <h2 className="font-serif text-4xl sm:text-5xl text-ink">Why Families <em>Choose Us</em></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">

            <div className="reveal">
              <div className="relative mb-7">
                <span className="font-display text-[6rem] font-bold text-maroon/6 leading-none absolute -top-2 -left-3 select-none pointer-events-none">1</span>
                <div className="w-12 h-12 bg-maroon/8 flex items-center justify-center relative z-10">
                  <svg className="w-5 h-5 text-maroon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                </div>
              </div>
              <h3 className="font-serif text-2xl text-ink mb-4">Safe Boarding<br/>Environment</h3>
              <p className="font-body text-[13px] text-stone leading-[1.85] mb-6">24/7 supervised hostel facilities with nutritious meals, medical care, and structured daily routines that make every student feel at home while developing independence and discipline.</p>
              <a href="#" className="ul-hover font-body text-[9px] tracking-[0.18em] uppercase text-maroon hover:text-ink transition-colors">Hostel Life</a>
            </div>

            <div className="reveal">
              <div className="relative mb-7">
                <span className="font-display text-[6rem] font-bold text-maroon/6 leading-none absolute -top-2 -left-3 select-none pointer-events-none">2</span>
                <div className="w-12 h-12 bg-maroon/8 flex items-center justify-center relative z-10">
                  <svg className="w-5 h-5 text-maroon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                </div>
              </div>
              <h3 className="font-serif text-2xl text-ink mb-4">Expert Faculty &amp;<br/>Academic Rigour</h3>
              <p className="font-body text-[13px] text-stone leading-[1.85] mb-6">Our 75+ highly qualified educators combine subject mastery with pastoral care. Small class sizes ensure personalised attention for every student at every stage of their learning journey.</p>
              <a href="#" className="ul-hover font-body text-[9px] tracking-[0.18em] uppercase text-maroon hover:text-ink transition-colors">Meet Our Faculty</a>
            </div>

            <div className="reveal">
              <div className="relative mb-7">
                <span className="font-display text-[6rem] font-bold text-maroon/6 leading-none absolute -top-2 -left-3 select-none pointer-events-none">3</span>
                <div className="w-12 h-12 bg-maroon/8 flex items-center justify-center relative z-10">
                  <svg className="w-5 h-5 text-maroon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </div>
              </div>
              <h3 className="font-serif text-2xl text-ink mb-4">Custom Digital<br/>School Management</h3>
              <p className="font-body text-[13px] text-stone leading-[1.85] mb-6">Our web app was built exclusively for us by SikshyaSanjal — a SaaS company that designs school management systems to order. Parents, teachers, and admin each have a dedicated portal, built around how Saraswati actually works.</p>
              <a href="#platform" className="ul-hover font-body text-[9px] tracking-[0.18em] uppercase text-maroon hover:text-ink transition-colors">Our Platform</a>
            </div>

          </div>
        </div>
      </section>


      {/* ============================================================
           SIKSHASANJAL PLATFORM  (Web App Features)
      ============================================================ */}
      <section id="platform" className="py-28 bg-ink grain-dark relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none" style={{background: "radial-gradient(circle, rgba(92,19,40,0.35) 0%, transparent 70%)"}}></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

            {/* Left: Text */}
            <div className="reveal-left">
              <span className="gold-line mb-5"></span>
              <p className="font-body text-[9px] tracking-[0.28em] uppercase text-goldlt/70 mb-4">Built by SikshyaSanjal</p>
              <h2 className="font-serif text-4xl sm:text-[52px] text-white leading-tight mb-6">
                Your School.<br/><em className="text-gold-grad">Your Web App.</em>
              </h2>
              <p className="font-body text-[13.5px] text-white/50 leading-[1.9] mb-4">
                SikshyaSanjal is a SaaS company that designs and delivers fully custom school management web apps — built from the ground up around each school's unique structure, workflow, and branding.
              </p>
              <p className="font-body text-[13.5px] text-white/50 leading-[1.9] mb-8">
                Saraswati Boarding School's portal was crafted exclusively for us — not a generic template, not a shared platform. Every feature, every screen, every role-based dashboard was built to match exactly how our school operates.
              </p>

              {/* Role pills */}
              <div className="flex flex-wrap gap-2 mb-10">
                <span className="font-body text-[9px] tracking-[0.16em] uppercase text-white/70 border border-white/15 px-4 py-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-goldlt"></span>Admin Portal
                </span>
                <span className="font-body text-[9px] tracking-[0.16em] uppercase text-white/70 border border-white/15 px-4 py-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-maroon"></span>Teacher Portal
                </span>
                <span className="font-body text-[9px] tracking-[0.16em] uppercase text-white/70 border border-white/15 px-4 py-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone"></span>Parent Portal
                </span>
              </div>

              <div className="flex gap-3">
                <Link to="/login" className="btn-gold"><span>Login to Portal</span></Link>
                <a href="#contact" className="btn-outline-white">Get a Demo</a>
              </div>
            </div>

            {/* Right: Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 reveal-right">

              {/* Feature 1 */}
              <div className="glass-card p-6 rounded-sm">
                <div className="feat-icon mb-5">
                  <svg className="w-5 h-5 text-goldlt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                </div>
                <h4 className="font-body text-white text-sm font-semibold mb-2">Attendance Tracking</h4>
                <p className="font-body text-[11.5px] text-white/40 leading-[1.75]">Real-time daily attendance marking and parent notifications — no paper registers.</p>
              </div>

              {/* Feature 2 */}
              <div className="glass-card p-6 rounded-sm sm:mt-6">
                <div className="feat-icon mb-5">
                  <svg className="w-5 h-5 text-goldlt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                </div>
                <h4 className="font-body text-white text-sm font-semibold mb-2">Grade &amp; Result Management</h4>
                <p className="font-body text-[11.5px] text-white/40 leading-[1.75]">Teachers publish marks; parents view live academic progress anytime.</p>
              </div>

              {/* Feature 3 */}
              <div className="glass-card p-6 rounded-sm">
                <div className="feat-icon mb-5">
                  <svg className="w-5 h-5 text-goldlt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                </div>
                <h4 className="font-body text-white text-sm font-semibold mb-2">Fee Management</h4>
                <p className="font-body text-[11.5px] text-white/40 leading-[1.75]">Transparent fee ledgers, payment history, and digital receipts for parents and admin.</p>
              </div>

              {/* Feature 4 */}
              <div className="glass-card p-6 rounded-sm sm:mt-6">
                <div className="feat-icon mb-5">
                  <svg className="w-5 h-5 text-goldlt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                </div>
                <h4 className="font-body text-white text-sm font-semibold mb-2">Notices &amp; Announcements</h4>
                <p className="font-body text-[11.5px] text-white/40 leading-[1.75]">Instant school notices pushed to parents and staff — no more missed updates.</p>
              </div>

              {/* Feature 5 */}
              <div className="glass-card p-6 rounded-sm sm:col-span-2">
                <div className="flex items-start gap-5">
                  <div className="feat-icon flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-goldlt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
                  </div>
                  <div>
                    <h4 className="font-body text-white text-sm font-semibold mb-2">Custom-Built for Your School</h4>
                    <p className="font-body text-[11.5px] text-white/40 leading-[1.75]">SikshyaSanjal builds each web app from scratch, tailored to your school's exact requirements — your branding, your workflows, your rules. No shared platform, no compromise. Just a dedicated, school-specific solution delivered as a SaaS product, maintained and updated by our team.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>


      {/* ============================================================
           STATS STRIP
      ============================================================ */}
      <section className="bg-maroon py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 divide-x divide-white/10">
            <div className="reveal text-center px-4">
              <div className="font-display text-5xl sm:text-6xl font-bold text-white leading-none mb-2">98<span className="text-goldlt">%</span></div>
              <div className="font-body text-[8.5px] tracking-[0.25em] uppercase text-white/40">SEE Pass Rate</div>
            </div>
            <div className="reveal text-center px-4">
              <div className="font-display text-5xl sm:text-6xl font-bold text-white leading-none mb-2">1,200<span className="text-goldlt text-4xl">+</span></div>
              <div className="font-body text-[8.5px] tracking-[0.25em] uppercase text-white/40">Students Enrolled</div>
            </div>
            <div className="reveal text-center px-4">
              <div className="font-display text-5xl sm:text-6xl font-bold text-white leading-none mb-2">75<span className="text-goldlt">+</span></div>
              <div className="font-body text-[8.5px] tracking-[0.25em] uppercase text-white/40">Expert Faculty</div>
            </div>
            <div className="reveal text-center px-4">
              <div className="font-display text-5xl sm:text-6xl font-bold text-white leading-none mb-2">35<span className="text-goldlt">+</span></div>
              <div className="font-body text-[8.5px] tracking-[0.25em] uppercase text-white/40">Years of Excellence</div>
            </div>
          </div>
        </div>
      </section>


      {/* ============================================================
           NEWS & EVENTS
      ============================================================ */}
      <section id="news" className="py-28 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16">
            <div className="reveal">
              <span className="gold-line mb-5"></span>
              <p className="font-body text-[9px] tracking-[0.28em] uppercase text-stone mb-3">Latest from the School</p>
              <h2 className="font-serif text-4xl sm:text-5xl italic text-ink leading-tight">
                News &amp; <em>Events</em>
              </h2>
            </div>
            <div className="reveal">
              <a href="#" className="ul-hover font-body text-[9px] tracking-[0.2em] uppercase text-maroon hover:text-ink transition-colors">See All Articles</a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

            <article className="reveal group cursor-pointer">
              <div className="img-zoom overflow-hidden mb-5">
                <img src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80&auto=format&fit=crop" alt="Annual Day" className="w-full h-56 object-cover"/>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-body text-[8px] tracking-[0.2em] uppercase text-goldlt">Events</span>
                <span className="w-4 h-px bg-stone/30"></span>
                <span className="font-body text-[8px] text-stone">Falgun 2081</span>
              </div>
              <h4 className="font-serif text-xl text-ink mb-3 leading-snug group-hover:text-maroon transition-colors">Annual Prize Distribution &amp; Cultural Evening 2081</h4>
              <p className="font-body text-[12px] text-stone leading-[1.85]">A grand celebration of student achievement, arts, and culture brought families and the school community together for an unforgettable evening of excellence.</p>
            </article>

            <article className="reveal group cursor-pointer">
              <div className="img-zoom overflow-hidden mb-5">
                <img src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=600&q=80&auto=format&fit=crop" alt="Science Olympiad" className="w-full h-56 object-cover"/>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-body text-[8px] tracking-[0.2em] uppercase text-goldlt">Achievement</span>
                <span className="w-4 h-px bg-stone/30"></span>
                <span className="font-body text-[8px] text-stone">Magh 2081</span>
              </div>
              <h4 className="font-serif text-xl text-ink mb-3 leading-snug group-hover:text-maroon transition-colors">Gold at National Science Olympiad — Class 8</h4>
              <p className="font-body text-[12px] text-stone leading-[1.85]">Our Class 8 science team secured first place at the National Science Olympiad, a testament to the exceptional mentorship by our faculty and student dedication.</p>
            </article>

            <article className="reveal group cursor-pointer">
              <div className="img-zoom overflow-hidden mb-5">
                <img src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&q=80&auto=format&fit=crop" alt="SEE Results" className="w-full h-56 object-cover"/>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-body text-[8px] tracking-[0.2em] uppercase text-goldlt">Academics</span>
                <span className="w-4 h-px bg-stone/30"></span>
                <span className="font-body text-[8px] text-stone">Baisakh 2081</span>
              </div>
              <h4 className="font-serif text-xl text-ink mb-3 leading-snug group-hover:text-maroon transition-colors">SEE 2080 — 98% Pass Rate, 14 Distinction Holders</h4>
              <p className="font-body text-[12px] text-stone leading-[1.85]">Our Class 10 students achieved outstanding results in the SEE 2080 examinations, with 14 students earning full distinctions across all subjects.</p>
            </article>

          </div>
        </div>
      </section>


      {/* ============================================================
           TESTIMONIALS
      ============================================================ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-16 reveal">
            <span className="gold-line mx-auto mb-5"></span>
            <h2 className="font-serif text-4xl sm:text-5xl text-ink"><em>What Parents Say</em></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            <div className="testi-card pl-6 py-2 reveal">
              <p className="font-body text-[13px] text-stone leading-[1.9] mb-5 italic">"The school portal built by SikshyaSanjal has transformed how we track our son's progress. I receive attendance notifications in real time and can view his grades from anywhere. A truly modern, purpose-built system."</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-parchment flex items-center justify-center flex-shrink-0">
                  <span className="font-display text-sm font-bold text-maroon">S</span>
                </div>
                <div>
                  <div className="font-body text-[11px] font-semibold text-ink">Sunita Adhikari</div>
                  <div className="font-body text-[10px] text-stone">Parent of Rohan, Class 7</div>
                </div>
              </div>
            </div>

            <div className="testi-card pl-6 py-2 reveal">
              <p className="font-body text-[13px] text-stone leading-[1.9] mb-5 italic">"Saraswati's boarding programme gave my daughter discipline, confidence, and friendships that will last a lifetime. The teachers genuinely care about each child's wellbeing."</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-parchment flex items-center justify-center flex-shrink-0">
                  <span className="font-display text-sm font-bold text-maroon">R</span>
                </div>
                <div>
                  <div className="font-body text-[11px] font-semibold text-ink">Rajesh Sharma</div>
                  <div className="font-body text-[10px] text-stone">Parent of Priya, Class 9</div>
                </div>
              </div>
            </div>

            <div className="testi-card pl-6 py-2 reveal">
              <p className="font-body text-[13px] text-stone leading-[1.9] mb-5 italic">"As a teacher, the app SikshyaSanjal built for us makes attendance and grade publishing effortless. It was designed around the way our school actually works — not a generic off-the-shelf solution."</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-parchment flex items-center justify-center flex-shrink-0">
                  <span className="font-display text-sm font-bold text-maroon">B</span>
                </div>
                <div>
                  <div className="font-body text-[11px] font-semibold text-ink">Binod Thapa</div>
                  <div className="font-body text-[10px] text-stone">Science Teacher, Class 8–10</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ============================================================
           FULL-WIDTH CTA BANNER
      ============================================================ */}
      <section className="relative py-40 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1920&q=85&auto=format&fit=crop" alt="School" className="w-full h-full object-cover"/>
          <div className="absolute inset-0" style={{background: "linear-gradient(to bottom, rgba(15,15,15,0.65) 0%, rgba(92,19,40,0.80) 100%)"}}></div>
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
          <span className="gold-line mx-auto mb-6"></span>
          <p className="font-body text-[9px] tracking-[0.3em] uppercase text-goldlt/70 mb-5">ज्ञान · विवेक · उत्कृष्टता</p>
          <h2 className="font-display text-white leading-tight mb-8">
            <span className="block text-6xl sm:text-8xl lg:text-9xl italic font-light">सरस्वती</span>
            <span className="block text-base sm:text-xl tracking-[0.35em] font-body uppercase text-white/60 mt-3">Boarding School</span>
          </h2>
          <p className="font-body text-white/50 text-[13px] leading-[1.9] max-w-md mx-auto mb-10">
            Begin your child's journey toward knowledge, character, and excellence. Admissions for 2081/82 B.S. are now open for Classes 1–10.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login" className="btn-gold"><span>Apply for Admission</span></Link>
            <Link to="/login" className="btn-outline-white">Access Parent Portal</Link>
          </div>
        </div>
      </section>


      {/* ============================================================
           CONTACT
      ============================================================ */}
      <section id="contact" className="py-28 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28">

            {/* Info */}
            <div className="reveal-left">
              <span className="gold-line mb-5"></span>
              <p className="font-body text-[9px] tracking-[0.28em] uppercase text-stone mb-4">Get in Touch</p>
              <h2 className="font-serif text-4xl sm:text-5xl text-ink mb-10 leading-tight">
                Contact<br/><em>the School</em>
              </h2>

              <div className="space-y-8">
                <div className="flex gap-4 items-start">
                  <div className="w-9 h-9 bg-maroon/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-maroon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                  <div>
                    <p className="font-body text-[9px] tracking-[0.2em] uppercase text-stone mb-1">Address</p>
                    <p className="font-body text-[13px] text-ink leading-relaxed">Saraswati Boarding School<br/>Kathmandu, Bagmati Province, Nepal</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-9 h-9 bg-maroon/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-maroon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  </div>
                  <div>
                    <p className="font-body text-[9px] tracking-[0.2em] uppercase text-stone mb-1">Phone</p>
                    <p className="font-body text-[13px] text-ink">+977-1-XXXXXXX</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-9 h-9 bg-maroon/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-maroon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </div>
                  <div>
                    <p className="font-body text-[9px] tracking-[0.2em] uppercase text-stone mb-1">Email</p>
                    <p className="font-body text-[13px] text-ink">info@saraswatiboarding.edu.np</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-9 h-9 bg-maroon/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-maroon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <div>
                    <p className="font-body text-[9px] tracking-[0.2em] uppercase text-stone mb-1">Office Hours</p>
                    <p className="font-body text-[13px] text-ink">Sunday – Friday &nbsp;·&nbsp; 10:00 AM – 4:00 PM NPT</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-10">
                <a href="#" className="font-body text-[8.5px] tracking-[0.18em] uppercase text-maroon border border-maroon/30 px-4 py-2.5 hover:bg-maroon hover:text-white hover:border-maroon transition-all">Facebook</a>
                <a href="#" className="font-body text-[8.5px] tracking-[0.18em] uppercase text-maroon border border-maroon/30 px-4 py-2.5 hover:bg-maroon hover:text-white hover:border-maroon transition-all">Instagram</a>
                <a href="#" className="font-body text-[8.5px] tracking-[0.18em] uppercase text-maroon border border-maroon/30 px-4 py-2.5 hover:bg-maroon hover:text-white hover:border-maroon transition-all">YouTube</a>
              </div>
            </div>

            {/* Form */}
            <div className="reveal-right">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <label className="block font-body text-[9px] tracking-[0.22em] uppercase text-stone mb-3">First Name</label>
                    <input type="text" name="firstName" placeholder="Ram" value={formData.firstName} onChange={handleChange} className="w-full border-b border-parchment bg-transparent pb-3 font-body text-[13px] focus:outline-none focus:border-maroon transition-colors placeholder-stone/30"/>
                  </div>
                  <div>
                    <label className="block font-body text-[9px] tracking-[0.22em] uppercase text-stone mb-3">Last Name</label>
                    <input type="text" name="lastName" placeholder="Sharma" value={formData.lastName} onChange={handleChange} className="w-full border-b border-parchment bg-transparent pb-3 font-body text-[13px] focus:outline-none focus:border-maroon transition-colors placeholder-stone/30"/>
                  </div>
                </div>
                <div>
                  <label className="block font-body text-[9px] tracking-[0.22em] uppercase text-stone mb-3">Email Address</label>
                  <input type="email" name="email" placeholder="ram@example.com" value={formData.email} onChange={handleChange} className="w-full border-b border-parchment bg-transparent pb-3 font-body text-[13px] focus:outline-none focus:border-maroon transition-colors placeholder-stone/30"/>
                </div>
                <div>
                  <label className="block font-body text-[9px] tracking-[0.22em] uppercase text-stone mb-3">Enquiry Type</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="w-full border-b border-parchment bg-transparent pb-3 font-body text-[13px] text-stone focus:outline-none focus:border-maroon transition-colors appearance-none cursor-pointer">
                    <option value="">Select…</option>
                    <option>Admission Enquiry</option>
                    <option>Hostel / Boarding</option>
                    <option>SikshyaSanjal Platform</option>
                    <option>General Enquiry</option>
                  </select>
                </div>
                <div>
                  <label className="block font-body text-[9px] tracking-[0.22em] uppercase text-stone mb-3">Message</label>
                  <textarea name="message" rows="4" placeholder="Your message…" value={formData.message} onChange={handleChange} className="w-full border-b border-parchment bg-transparent pb-3 font-body text-[13px] focus:outline-none focus:border-maroon transition-colors placeholder-stone/30 resize-none"></textarea>
                </div>
                <button type="submit" className="btn-maroon" disabled={submitting}>
                  <span>{submitting ? "Sending..." : "Send Message"}</span>
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>


      {/* ============================================================
           FOOTER
      ============================================================ */}
      <footer className="bg-ink text-white/50 pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Top grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-10 pb-16 border-b border-white/8">

            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-full bg-maroon flex items-center justify-center flex-shrink-0">
                  <span className="font-display text-2xl font-bold text-white">स</span>
                </div>
                <div>
                  <div className="font-display text-[15px] font-semibold text-white tracking-wide">Saraswati</div>
                  <div className="font-body text-[8px] tracking-[0.22em] uppercase text-white/30 mt-0.5">Boarding School</div>
                </div>
              </div>
              <p className="font-body text-[12px] text-white/35 leading-[1.85] mb-6 max-w-xs">
                Empowering young minds from Class 1 to 10 through premium boarding education since 2045 B.S. School web app custom-built by SikshyaSanjal.
              </p>
              <div className="flex gap-2 flex-wrap">
                <a href="#" className="font-body text-[8px] tracking-[0.15em] uppercase text-white/30 border border-white/10 px-3 py-2 hover:border-goldlt/40 hover:text-goldlt/70 transition-all">Facebook</a>
                <a href="#" className="font-body text-[8px] tracking-[0.15em] uppercase text-white/30 border border-white/10 px-3 py-2 hover:border-goldlt/40 hover:text-goldlt/70 transition-all">Instagram</a>
                <a href="#" className="font-body text-[8px] tracking-[0.15em] uppercase text-white/30 border border-white/10 px-3 py-2 hover:border-goldlt/40 hover:text-goldlt/70 transition-all">YouTube</a>
              </div>
            </div>

            {/* About */}
            <div>
              <h5 className="font-body text-[9px] tracking-[0.22em] uppercase text-white/70 mb-5">About</h5>
              <ul className="space-y-3">
                <li><a href="#" className="font-body text-[12px] text-white/35 hover:text-white transition-colors">Our History</a></li>
                <li><a href="#" className="font-body text-[12px] text-white/35 hover:text-white transition-colors">Principal's Message</a></li>
                <li><a href="#" className="font-body text-[12px] text-white/35 hover:text-white transition-colors">Our Faculty</a></li>
                <li><a href="#" className="font-body text-[12px] text-white/35 hover:text-white transition-colors">Boarding Life</a></li>
              </ul>
            </div>

            {/* Classes */}
            <div>
              <h5 className="font-body text-[9px] tracking-[0.22em] uppercase text-white/70 mb-5">Classes</h5>
              <ul className="space-y-3">
                <li><a href="#" className="font-body text-[12px] text-white/35 hover:text-white transition-colors">Primary (1–5)</a></li>
                <li><a href="#" className="font-body text-[12px] text-white/35 hover:text-white transition-colors">Middle (6–8)</a></li>
                <li><a href="#" className="font-body text-[12px] text-white/35 hover:text-white transition-colors">Secondary (9–10)</a></li>
                <li><a href="#" className="font-body text-[12px] text-white/35 hover:text-white transition-colors">Key Dates</a></li>
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h5 className="font-body text-[9px] tracking-[0.22em] uppercase text-white/70 mb-5">Quick Links</h5>
              <ul className="space-y-3">
                <li><a href="#platform" className="font-body text-[12px] text-white/35 hover:text-white transition-colors">SikshyaSanjal Platform</a></li>
                <li><a href="#news" className="font-body text-[12px] text-white/35 hover:text-white transition-colors">News &amp; Events</a></li>
                <li><Link to="/login" className="font-body text-[12px] text-white/35 hover:text-white transition-colors">Apply Now</Link></li>
                <li>
                  <Link to="/login" className="font-body text-[12px] text-goldlt/70 hover:text-goldlt transition-colors font-medium">
                    → Login to Portal
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="font-body text-[10px] tracking-wide text-white/20">
              © 2081 B.S. Saraswati Boarding School. All rights reserved.
            </p>
            <p className="font-body text-[10px] tracking-wide text-white/20">
              Custom Web App by <a href="#" className="text-goldlt/50 hover:text-goldlt transition-colors">SikshyaSanjal</a>
            </p>
            <div className="flex gap-5">
              <a href="#" className="font-body text-[10px] text-white/20 hover:text-white/60 transition-colors">Privacy Policy</a>
              <a href="#" className="font-body text-[10px] text-white/20 hover:text-white/60 transition-colors">Terms of Use</a>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
