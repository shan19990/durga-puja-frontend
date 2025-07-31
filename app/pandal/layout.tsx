import ClientWrapper from "@/components/ClientWrapper";
import Navigation from "@/components/navigation";

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <ClientWrapper>
            <Navigation/>
            {children}
        </ClientWrapper>
    );
}
