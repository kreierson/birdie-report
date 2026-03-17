import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    category: z.enum(['reviews', 'tips', 'deals', 'news', 'best', 'courses', 'versus', 'opinion']),
    subcategory: z.enum([
      'drivers', 'irons', 'wedges', 'putters', 'balls', 'bags', 'rangefinders', 
      'gps', 'training-aids', 'shoes', 'apparel', 'accessories', 
      'pga-tour', 'liv', 'equipment-news', 'rule-changes',
      'swing-tips', 'putting', 'short-game', 'course-management', 'mental-game',
      'course-reviews', 'travel-guides', 'hot-takes', 'editorial'
    ]).optional(),
    tags: z.array(z.string()),
    featured_image: z.string(),
    author: z.string().default('Kyle Reierson'),
    rating: z.number().min(1).max(10).optional(),
    pros: z.array(z.string()).optional(),
    cons: z.array(z.string()).optional(),
    price: z.string().optional(),
    affiliate_links: z.array(z.object({
      product: z.string(),
      url: z.string(),
      price: z.string().optional(),
      retailer: z.string()
    })).optional(),
    comparison_products: z.array(z.object({
      name: z.string(),
      rating: z.number(),
      price: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      affiliate_url: z.string()
    })).optional(),
    featured: z.boolean().default(false),
    seo_title: z.string().optional(),
    seo_description: z.string().optional()
  })
});

export const collections = { blog };