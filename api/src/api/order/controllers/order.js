'use strict';

const { default: Stripe } = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET);

/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({strapi}) => ({
    async create(ctx) {
        const {products} = ctx.request.body;
        console.log(products);
        try {
            const lineItems = await Promise.all(
                products.map(async (product) => {
                  const item = await strapi
                    .service("api::product.product")
                    .findOne(product.documentId);

                  console.log(item);
        
                  return {
                    price_data: {
                      currency: "usd",
                      product_data: {
                        name: item.title,
                      },
                      unit_amount: Math.round(item.price * 100),
                    },
                    quantity: product.quantity,
                  };
                })
              );

            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                success_url: `${process.env.CLIENT_URL}?success=true`,
                cancel_url: `${process.env.CLIENT_URL}?success=false`,
                line_items: lineItems,
                payment_method_types: ["card"],
                shipping_address_collection: {allowed_countries: ['US', 'CA']},
            })

            await strapi
              .service("api::order.order")
              .create({ data: {  products, stripeId: session.id } });

      return { stripeSession: session };

        } catch (error) {
          console.log(error);
            ctx.response.status = 500;
            return error;
        }
    }
}));
