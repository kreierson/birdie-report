// Product links the article modules can render. Posts have collected these
// under more than one frontmatter shape; the layout used to read only two of them.
import { productNamesMatch } from './product-buy.mjs';

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
  if (clean(link.image)) item.image = clean(link.image);
  if (typeof link.rating === 'number') item.rating = link.rating;
  if (Array.isArray(link.pros) && link.pros.length) item.pros = link.pros;
  return item;
}

function pagePros(content) {
  if (Array.isArray(content.pros) && content.pros.length) return content.pros;
  if (Array.isArray(content.product_pros) && content.product_pros.length) return content.product_pros;
  return null;
}

function enrichFromComparison(links, content) {
  const products = Array.isArray(content.comparison_products) ? content.comparison_products : [];
  if (!products.length) return links;
  return links.map((link) => {
    const match = products.find((product) => productNamesMatch(link.product, product?.name || product?.product || ''));
    if (!match) return link;
    const next = { ...link };
    if (!next.pros?.length && Array.isArray(match.pros) && match.pros.length) next.pros = match.pros;
    if (!next.price && clean(match.price)) next.price = clean(match.price);
    if (!next.image && clean(match.image)) next.image = clean(match.image);
    if (typeof next.rating !== 'number' && typeof match.rating === 'number') next.rating = match.rating;
    return next;
  });
}

function withSingleProductFacts(links, content) {
  if (links.length !== 1) return links;
  const only = { ...links[0] };
  const pros = pagePros(content);
  if (!only.pros?.length && pros) only.pros = pros;
  if (!only.price && clean(content.price)) only.price = clean(content.price);
  if (typeof only.rating !== 'number' && typeof content.rating === 'number') only.rating = content.rating;
  return [only];
}

export function buyerProductsFromContent(content = {}) {
  const affiliate = (content.affiliate_links || [])
    .map((link) => asLink({
      product: link?.product,
      url: link?.url || link?.affiliate_url,
      retailer: link?.retailer,
      price: link?.price,
      image: link?.image,
      rating: link?.rating,
      pros: link?.pros,
    }))
    .filter(Boolean);
  if (affiliate.length) return withSingleProductFacts(enrichFromComparison(affiliate, content), content);

  const review = content.review_product;
  const reviewUrl = clean(review?.affiliate_url || review?.url);
  if (reviewUrl) {
    const link = asLink({
      product: review.name || review.product || productLabelFromAmazonUrl(reviewUrl),
      url: reviewUrl,
      retailer: review.retailer,
      price: review.price,
      image: review.image,
      rating: review.rating,
      pros: review.pros,
    });
    if (link) return withSingleProductFacts([link], content);
  }

  const pageUrl = clean(content.affiliate_url);
  if (pageUrl) {
    const link = asLink({
      product: content.product || productLabelFromAmazonUrl(pageUrl) || content.title,
      url: pageUrl,
      price: content.price,
      image: content.image,
      rating: content.rating,
      pros: content.pros?.length ? content.pros : content.product_pros,
    });
    if (link) return withSingleProductFacts([link], content);
  }

  return withSingleProductFacts((content.comparison_products || [])
    .map((product) => asLink({
      product: product?.name || product?.product,
      url: product?.affiliate_url || product?.url,
      price: product?.price,
      image: product?.image,
      rating: product?.rating,
      pros: product?.pros,
    }))
    .filter(Boolean), content);
}
