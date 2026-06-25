export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-16 py-12">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-serif font-bold text-lg text-primary mb-4">Tally's Barbershop</h3>
          <p className="text-sm text-muted-foreground">
            Premium Kenyan barbershop and beauty studio. Dark, luxurious, gold-accented excellence.
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/services" className="hover:text-primary">Services</a></li>
            <li><a href="/team" className="hover:text-primary">Our Team</a></li>
            <li><a href="/book" className="hover:text-primary">Book Now</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-4">Location</h4>
          <address className="not-italic text-sm text-muted-foreground space-y-2">
            <p>Nairobi, Kenya</p>
            <p>Open Mon-Sun</p>
            <p>8:00 AM - 8:00 PM</p>
          </address>
        </div>
        <div>
          <h4 className="font-bold mb-4">Contact</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>+254 700 000 000</li>
            <li>hello@tallys.co.ke</li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Tally's Barbershop & Beauty Studio. All rights reserved.
      </div>
    </footer>
  );
}