const topics = [
  ['rangefinders', /rangefinder|coolshot|tour v[6-9]|pro x3|approach z82|precision pro/i],
  ['watches', /gps watch|approach s\d|shot scope v5|ion elite|galaxy watch/i],
  ['balls', /golf ball|chrome soft|chrome tour|pro v1|tp5|tour response|soft feel|supersoft/i],
  ['bags', /golf bag|cart bag|stand bag|hoofer|c-130|cart 14|player v|fairway c/i],
  ['shoes', /golf shoe|tour360|codechaos|biom c4|pro sl|premiere series|fresh foam/i],
  ['putters', /putter|putting|scotty cameron|odyssey|lab df|phantom/i],
  ['irons', /iron|steel vs graphite|kbs tour/i],
  ['drivers', /driver/i],
  ['wedges', /wedge|vokey|zipcore/i],
  ['sunglasses', /sunglass|prizm|ho.okipa/i],
  ['launch-monitors', /launch monitor|skytrak|mevo|launch pro|full swing kit/i],
];
const generic = new Set(['golf', 'best', 'reviews', 'review', 'equipment', '2026', '2025', 'comparison', 'versus', 'buying guide', 'equipment review', 'golf news', 'golf deals', 'golf opinion', 'golf tips', 'golf tech', 'golf technology']);
function topic(post) {
  return topics.find(([, pattern]) => pattern.test(post.data.title))?.[0];
}
function tags(post) {
  return new Set((post.data.tags || []).map(tag => tag.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()).filter(tag => !generic.has(tag) && !/^\d{4}$/.test(tag)));
}
export function selectRelatedPosts(posts, current, limit = 4) {
  const currentTopic = topic(current);
  const currentTags = tags(current);
  return posts.filter(post => post.slug !== current.slug).map(post => {
    const overlap = [...tags(post)].filter(tag => currentTags.has(tag)).length;
    const sameTopic = currentTopic && topic(post) === currentTopic;
    const subcategoryMatch = current.data.subcategory && post.data.subcategory === current.data.subcategory;
    return { post, score: (sameTopic ? 100 : 0) + overlap * 10 + (subcategoryMatch ? 20 : 0) };
  }).filter(item => item.score >= 10)
    .sort((a, b) => b.score - a.score || new Date(b.post.data.updated || b.post.data.date) - new Date(a.post.data.updated || a.post.data.date))
    .slice(0, limit).map(item => item.post);
}
