import ClientWrapper from "@/components/ClientWrapper";
import Navigation from "@/components/navigation";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <ClientWrapper>
            <GoogleAnalytics />
            <Navigation/>
            {children}
        </ClientWrapper>
    );
}
