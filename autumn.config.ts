import {
	feature,
	product,
	featureItem,
	pricedFeatureItem,
	priceItem,
} from "atmn";

// Features
export const standardMessages = feature({
	id: "standard_messages",
	name: "Standard Messages",
	type: "single_use",
});

export const premiumMessages = feature({
	id: "premium_messages",
	name: "Premium Messages",
	type: "single_use",
});

export const seats = feature({
	id: "seats",
	name: "Seats",
	type: "continuous_use",
});

// Products
export const free = product({
	id: "free",
	name: "Free",
	is_default: true,
	items: [
		featureItem({
			feature_id: seats.id,
			included_usage: 1,
		}),

		featureItem({
			feature_id: standardMessages.id,
			included_usage: 20,
			interval: "month",
		}),
	],
});

export const plus = product({
	id: "plus",
	name: "plus",
	items: [
		priceItem({
			price: 190, // $10 USD
			interval: "month",
		}),

		pricedFeatureItem({
			feature_id: seats.id,
			price: 190, // $10 USD
			interval: "month",
			included_usage: 1,
			billing_units: 1,
			usage_model: "pay_per_use",
		}),

		featureItem({
			feature_id: premiumMessages.id,
			included_usage: 100,
			interval: "month",
		}),

		featureItem({
			feature_id: standardMessages.id,
			included_usage: 1000,
			interval: "month",
		}),
	],
});

export const pro = product({
	id: "pro",
	name: "pro",
	items: [
		priceItem({
			price: 480, // $24 USD
			interval: "month",
		}),

		pricedFeatureItem({
			feature_id: seats.id,
			price: 480, // $24 USD
			interval: "month",
			included_usage: 1,
			billing_units: 1,
			usage_model: "pay_per_use",
		}),

		featureItem({
			feature_id: premiumMessages.id,
			included_usage: 270,
			interval: "month",
		}),

		featureItem({
			feature_id: standardMessages.id,
			included_usage: 2700,
			interval: "month",
		}),
	],
});
