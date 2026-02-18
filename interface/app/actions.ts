"use server";

export async function addToWaitlist(prevState: any, formData: FormData) {
    const email = formData.get("email") as string;
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!email || !email.includes("@")) {
        return { success: false, message: "Please enter a valid email address." };
    }

    if (!webhookUrl) {
        console.error("DISCORD_WEBHOOK_URL is not defined");
        return { success: false, message: "System error: Webhook not configured." };
    }

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: `🆕 **New Waitlist Signup**\nEmail: \`${email}\`\nSource: Weppo Landing Page`,
            }),
        });

        if (!response.ok) {
            throw new Error(`Discord API error: ${response.statusText}`);
        }

        return { success: true, message: "You're on the list!" };
    } catch (error) {
        console.error("Failed to send to Discord:", error);
        return { success: false, message: "Something went wrong. Please try again." };
    }
}
