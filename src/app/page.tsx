"use client";

import { AppHeader } from '@/components/header';
import { AppFooter } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Zap, Database, BarChart3, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});

type FormData = z.infer<typeof formSchema>;

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Zap,
    title: "Next.js Integration",
    description: "Server-side rendering and routing capabilities for optimal performance.",
  },
  {
    icon: Database,
    title: "TanStack Query",
    description: "Efficient data fetching, caching, and state management.",
  },
  {
    icon: BarChart3,
    title: "Shadcn UI",
    description: "Accessible and beautifully designed UI components.",
  },
  {
    icon: ShieldCheck,
    title: "Zod Validation",
    description: "Robust schema definition and data validation for type safety.",
  },
];

export default function HomePage() {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  async function onSubmit(values: FormData) {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(values);
    toast({
      title: "Message Sent!",
      description: "We've received your message and will get back to you shortly.",
      action: (
        <Button variant="ghost" size="sm" onClick={() => console.log('Undo action')}>
          Undo
        </Button>
      ),
    });
    form.reset();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 sm:py-24 text-center">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Welcome to Mentos 2.0
          </h1>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            A powerful starter kit leveraging Next.js, TanStack Query, Shadcn UI, Axios, and Zod to kickstart your next big project.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <Button size="lg">Get Started</Button>
            <Button size="lg" variant="outline">Learn More</Button>
          </div>
        </section>

        {/* Placeholder Image Section */}
        <section className="container mx-auto px-4 py-12">
            <Card className="overflow-hidden shadow-lg">
                <Image
                  src="https://placehold.co/1200x600.png"
                  alt="Abstract placeholder image"
                  width={1200}
                  height={600}
                  className="w-full h-auto object-cover"
                  data-ai-hint="abstract technology"
                />
            </Card>
        </section>


        {/* Features Section */}
        <section className="container mx-auto px-4 py-16 sm:py-24">
          <h2 className="text-3xl font-semibold tracking-tight text-center mb-12">Core Features</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <feature.icon className="w-8 h-8 text-primary" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Form Section */}
        <section className="container mx-auto px-4 py-16 sm:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight mb-4">Get In Touch</h2>
              <p className="text-muted-foreground mb-8">
                Have questions or want to learn more? Send us a message!
              </p>
              <Image
                src="https://placehold.co/600x400.png"
                alt="Contact placeholder image"
                width={600}
                height={400}
                className="rounded-lg shadow-md object-cover"
                data-ai-hint="contact support"
              />
            </div>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
                <CardDescription>Fill out the form below and we'll get back to you.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Your message..." {...field} className="min-h-[120px]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </section>

      </main>
      <AppFooter />
    </div>
  );
}
