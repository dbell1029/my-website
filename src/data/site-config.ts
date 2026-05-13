import avatar from '../assets/images/avatar.jpg';
import hero from '../assets/images/hero.jpg';
import type { SiteConfig } from '../types';

const siteConfig: SiteConfig = {
    website: 'https://david-bell.net',
    avatar: {
        src: avatar,
        alt: 'David Bell'
    },
    title: 'David Bell',
    subtitle: 'data | gaming | content',
    description: 'Personal site of David Bell — data, gaming, and everything in between.',
    image: {
        src: '/preview.jpeg',
        alt: 'David Bell personal website'
    },
    headerNavLinks: [
        {
            text: 'Home',
            href: '/'
        },
        {
            text: 'Blog',
            href: '/blog'
        },
        {
            text: 'Projects',
            href: '/projects'
        },
        {
            text: 'About',
            href: '/about'
        }
    ],
    footerNavLinks: [
        {
            text: 'About',
            href: '/about'
        },
        {
            text: 'Contact',
            href: '/contact'
        }
    ],
    socialLinks: [
        {
            text: 'LinkedIn',
            href: 'https://www.linkedin.com/in/belldavidb/'
        },
        {
            text: 'GitHub',
            href: 'https://github.com/dbell1029'
        },
        {
            text: 'Instagram',
            href: 'https://instagram.com/dabisbesh'
        }
    ],
    hero: {
        title: 'Hey, I\'m David.',
        text: "I spent over four years working on **Fortnite** at Epic Games, most recently as Competitive Operations Manager. I care about data, great products, and building things.\n\nOutside of work I'm a hardcore Harry Potter fan, avid gamer, LARPing outdoorsman, and content creator over at [@dabisbesh](https://instagram.com/dabisbesh).\n\nThis is my internet nook — projects, blog posts, and whatever else I feel like putting here.\n\nWelcome!",
        image: {
            src: hero,
            alt: 'David Bell'
        },
        actions: [
            {
                text: 'Get in Touch',
                href: '/contact'
            }
        ]
    }
};

export default siteConfig;