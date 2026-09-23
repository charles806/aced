export const ACED_PRO_QUANTITY = 1;

/**
 * Server-side product resolver for ACED Pro.
 *
 * The product ID never comes from the frontend and is never displayed to the
 * browser. It is read from the server-only environment variable
 * `ACED_PRO_PRODUCT_ID`, which must point at the ACED Pro catalog product
 * configured in the payment provider's dashboard.
 *
 * Do not hardcode a product ID here.
 */
export function getAcedProProductId(): string {
    const productId = process.env.ACED_PRO_PRODUCT_ID?.trim();

    if (!productId) {
        throw new Error(
            "ACED_PRO_PRODUCT_ID is not configured. Set it in the server environment " +
                "so product IDs and prices are never supplied by the frontend."
        );
    }

    return productId;
}