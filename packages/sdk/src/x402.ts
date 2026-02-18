/**
 * x402 Protocol Helpers
 * 
 * Utilities for parsing 402 Payment Required responses and generating
 * Weppo headers for settlement.
 */

export interface X402Challenge {
    realm?: string;
    description?: string;
    amount?: number;
    currency?: string;
    recipient?: string; // The agent ID to pay
    invoiceId?: string; // If pre-generated invoice
    token?: string; // Opaque token to sign or include
}

/**
 * Parses the `WWW-Authenticate` header from a 402 response.
 * Example Header: Weppo realm="AgentService", amount="0.5", currency="USDC", recipient="agent_B", token="xyz"
 */
export function parse402Header(header: string): X402Challenge | null {
    if (!header || !header.startsWith('Weppo ')) return null;

    const content = header.substring(6); // Remove "Weppo "
    const result: any = {};

    // Regex to capture key="value" pairs
    const regex = /(\w+)="([^"]*)"/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        const value = match[2];

        // Convert known numeric fields
        if (key === 'amount') {
            result[key] = parseFloat(value);
        } else {
            result[key] = value;
        }
    }

    return result as X402Challenge;
}

/**
 * Constructs the `Authorization` header for a Weppo payment proof.
 * Format: Weppo <payment_id>
 */
export function formatWeppoAuth(paymentId: string): string {
    return `Weppo ${paymentId}`;
}
