import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import OfferPopup from '../../components/ui/OfferPopup';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <OfferPopup />
      <main>{children}</main>
      <Footer />
    </>
  );
}
