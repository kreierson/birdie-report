// Product links the article modules can render. Posts have collected these
// under more than one frontmatter shape; the layout used to read only two of them.

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function productLabelFromAmazonUrl(url) {
  try {
    const query = new URL(url).searchParams.get('k');
    return query ? query.trim().replace(/\s+/g, ' ') : '';
  } catch {
    return '';
  }
}

function asLink(link) {
  const url = clean(link?.url);
  const product = clean(link?.product);
  if (!url || !product) return null;
  const item = {
    product,
    url,
    retailer: clean(link.retailer) || 'Amazon',
  };
  if (clean(link.price)) item.price = clean(link.price);
  if (typeof link.rating === 'number') item.rating = link.rating;
  if (Array.isArray(link.pros) && link.pros.length) item.pros = link.pros;
  return item;
}

export function buyerProductsFromContent(content = {}) {
  const affiliate = (content.affiliate_links || [])
    .map((link) => asLink({
      product: link?.product,
      url: link?.url || link?.affiliate_url,
      retailer: link?.retailer,
      price: link?.price,
      rating: link?.rating,
      pros: link?.pros,
    }))
    .filter(Boolean);
  if (affiliate.length) return affiliate;

  const review = content.review_product;
  const reviewUrl = clean(review?.affiliate_url || review?.url);
  if (reviewUrl) {
    const link = asLink({
      product: review.name || review.product || productLabelFromAmazonUrl(reviewUrl),
      url: reviewUrl,
      retailer: review.retailer,
      price: review.price,
      rating: review.rating,
      pros: review.pros,
    });
    if (link) return [link];
  }

  const pageUrl = clean(content.affiliate_url);
  if (pageUrl) {
    const link = asLink({
      product: content.product || productLabelFromAmazonUrl(pageUrl) || content.title,
      url: pageUrl,
      price: content.price,
      rating: content.rating,
      pros: content.pros?.length ? content.pros : content.product_pros,
    });
    if (link) return [link];
  }

  return (content.comparison_products || [])
    .map((product) => asLink({
      product: product?.name || product?.product,
      url: product?.affiliate_url || product?.url,
      price: product?.price,
      rating: product?.rating,
      pros: product?.pros,
    }))
    .filter(Boolean);
}
