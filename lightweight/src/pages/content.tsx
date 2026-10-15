import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import { api, ApiError } from '../api/client'
import type {
  BlogPostListModel,
  BlogPostModel,
  ContactUsModel,
  ContactVendorModel,
  CustomerProfileModel,
  SitemapModel,
  TopicModel,
  UrlResolveModel,
} from '../api/types'
import AttributeInputs, { initialAttributeValues } from '../components/AttributeInputs'
import { menuLink } from '../components/Layout'
import { useToast } from '../components/Toast'
import { ErrorMessage, Field, formatDate, Html, Img, Loading, Notice, Pager, QueryView } from '../components/ui'
import { CategoryPage, ManufacturerPage, TagPage, VendorPage } from './catalog'
import { ProductPage } from './product'

/* ---------- SEO URLs ---------- */

/** Resolves "/{slug}" like the storefront and renders the page of the entity (see API.md, "SEO-URLs auflösen"). */
export function SlugPage() {
  const { slug = '' } = useParams()
  const resolved = useQuery({
    queryKey: ['resolve', slug],
    queryFn: () => api.get<UrlResolveModel>('/common/url/resolve', { slug }),
    retry: false,
  })

  if (resolved.isPending) return <Loading />
  if (resolved.isError) {
    if (resolved.error instanceof ApiError && resolved.error.status === 404) return <NotFoundPage />
    return <ErrorMessage error={resolved.error} />
  }

  const { entityName, entityId, redirectToSlug } = resolved.data
  if (redirectToSlug && redirectToSlug !== slug) return <Navigate to={`/${redirectToSlug}`} replace />

  switch (entityName) {
    case 'Product':
      return <ProductPage key={entityId} id={entityId} />
    case 'Category':
      return <CategoryPage key={entityId} id={entityId} />
    case 'Manufacturer':
      return <ManufacturerPage key={entityId} id={entityId} />
    case 'Vendor':
      return <VendorPage key={entityId} id={entityId} />
    case 'ProductTag':
      return <TagPage key={entityId} id={entityId} />
    case 'Topic':
      return <TopicView key={entityId} topicKey={entityId} />
    case 'BlogPost':
      return <BlogPostView key={entityId} id={entityId} />
    default:
      return <Notice kind="warning">Der Seitentyp „{entityName}“ (#{entityId}) wird von diesem Frontend nicht unterstützt.</Notice>
  }
}

export function NotFoundPage() {
  return (
    <div className="center">
      <h1>Seite nicht gefunden</h1>
      <p><Link to="/">Zur Startseite</Link></p>
    </div>
  )
}

/* ---------- topics ---------- */

export function TopicView({ topicKey }: { topicKey: number | string }) {
  const topic = useQuery({ queryKey: ['topic', topicKey], queryFn: () => api.get<TopicModel>(`/common/topics/${topicKey}`) })
  return (
    <QueryView query={topic}>
      {t => (
        <article className="topic">
          <h1>{t.title}</h1>
          {t.isPasswordProtected ? <Notice kind="warning">Diese Seite ist passwortgeschützt (nicht über die API unterstützt).</Notice> : <Html html={t.body} />}
        </article>
      )}
    </QueryView>
  )
}

export function TopicBySystemNamePage() {
  return <TopicView topicKey={useParams().systemName ?? ''} />
}

/* ---------- sitemap ---------- */

export function SitemapPage() {
  const [page, setPage] = useState(1)
  const sitemap = useQuery({ queryKey: ['sitemap', page], queryFn: () => api.get<SitemapModel>('/common/sitemap', { pageNumber: page }) })
  return (
    <>
      <h1>Sitemap</h1>
      <QueryView query={sitemap}>
        {s => {
          const groups = Object.groupBy(s.items, item => item.groupTitle)
          return (
            <>
              <div className="sitemap">
                {Object.entries(groups).map(([group, items]) => (
                  <div key={group}>
                    <h3>{group}</h3>
                    <ul>{items?.map(item => <li key={item.url}><Link to={menuLink(item.url)}>{item.name}</Link></li>)}</ul>
                  </div>
                ))}
              </div>
              <Pager pager={s.pageModel} onPage={setPage} />
            </>
          )
        }}
      </QueryView>
    </>
  )
}

/* ---------- blog ---------- */

function BlogSidebar() {
  const tags = useQuery({ queryKey: ['blog-tags'], queryFn: () => api.get<{ tags: { name: string; blogPostCount: number }[] }>('/blog/tags') })
  const months = useQuery({ queryKey: ['blog-months'], queryFn: () => api.get<{ year: number; months: { month: number; blogPostCount: number }[] }[]>('/blog/months') })
  return (
    <aside className="side">
      {months.data && months.data.length > 0 && (
        <div className="block">
          <h4>Archiv</h4>
          <ul className="tree">
            {months.data.map(y => (
              <li key={y.year}>
                {y.year}
                <ul>
                  {y.months.map(m => (
                    <li key={m.month}><Link to={`/blog/month/${y.year}-${m.month}`}>{new Date(y.year, m.month - 1).toLocaleString(undefined, { month: 'long' })} ({m.blogPostCount})</Link></li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tags.data && tags.data.tags.length > 0 && (
        <div className="block">
          <h4>Tags</h4>
          <div className="tags">{tags.data.tags.map(t => <Link key={t.name} to={`/blog/tag/${encodeURIComponent(t.name)}`}>{t.name} ({t.blogPostCount})</Link>)}</div>
        </div>
      )}
    </aside>
  )
}

export function BlogListPage() {
  const { tag, month } = useParams()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('pageNumber') ?? 1)
  const list = useQuery({
    queryKey: ['blog', tag, month, page],
    queryFn: () => api.get<BlogPostListModel>('/blog', { tag, month, pageNumber: page }),
  })
  return (
    <div className="with-side">
      <BlogSidebar />
      <div>
        <h1>Blog{tag && ` – Tag „${tag}“`}{month && ` – ${month}`}</h1>
        <QueryView query={list}>
          {l =>
            l.blogPosts.length === 0 ? (
              <Notice>Keine Beiträge vorhanden.</Notice>
            ) : (
              <>
                {l.blogPosts.map(post => (
                  <article key={post.id} className="card">
                    <h2><Link to={`/${post.seName}`}>{post.title}</Link></h2>
                    <div className="small muted">{formatDate(post.createdOn)} · {post.numberOfComments} Kommentar(e)</div>
                    <Html html={post.bodyOverview || post.body} />
                  </article>
                ))}
                <Pager pager={l.pagingFilteringContext} onPage={p => setParams({ pageNumber: String(p) })} />
              </>
            )
          }
        </QueryView>
      </div>
    </div>
  )
}

export function BlogPostView({ id }: { id: number }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const post = useQuery({ queryKey: ['blog-post', id], queryFn: () => api.get<BlogPostModel>(`/blog/${id}`) })
  const [comment, setComment] = useState('')
  const add = useMutation({
    mutationFn: () => api.post<{ isApproved: boolean; result: string; blogPost: BlogPostModel }>(`/blog/${id}/comments`, { addNewComment: { commentText: comment } }),
    onSuccess: result => {
      toast(result.result)
      queryClient.setQueryData(['blog-post', id], result.blogPost)
      setComment('')
    },
  })

  return (
    <div className="with-side">
      <BlogSidebar />
      <QueryView query={post}>
        {p => (
          <article>
            <h1>{p.title}</h1>
            <div className="small muted">{formatDate(p.createdOn)}</div>
            <Html html={p.body} className="description" />
            {p.tags.length > 0 && <div className="tags">{p.tags.map(t => <Link key={t} to={`/blog/tag/${encodeURIComponent(t)}`}>{t}</Link>)}</div>}
            {p.allowComments && (
              <section>
                <h2>Kommentare ({p.comments.length})</h2>
                {p.comments.map(c => (
                  <div key={c.id} className="review">
                    <div className="small muted"><Link to={`/profile/${c.customerId}`}>{c.customerName}</Link> · {formatDate(c.createdOn)}</div>
                    <p>{c.commentText}</p>
                  </div>
                ))}
                <form className="card" onSubmit={e => { e.preventDefault(); add.mutate() }}>
                  <Field label="Kommentar"><textarea required value={comment} onChange={e => setComment(e.target.value)} /></Field>
                  <ErrorMessage error={add.error} />
                  <button className="primary" disabled={add.isPending}>Kommentar senden</button>
                </form>
              </section>
            )}
          </article>
        )}
      </QueryView>
    </div>
  )
}

export function BlogPostByIdPage() {
  return <BlogPostView id={Number(useParams().id)} />
}

/* ---------- contact ---------- */

function ContactForm<T extends ContactUsModel>({ initial, send }: { initial: T; send: (values: T) => Promise<T> }) {
  const [values, setValues] = useState(initial)
  const [attributes, setAttributes] = useState(() => initialAttributeValues(initial.contactFormAttributes, 'contact_attribute_'))
  const submit = useMutation({ mutationFn: () => send({ ...values, attributes }) })

  if (submit.data?.successfullySent) return <Notice kind="success">{submit.data.result ?? 'Ihre Anfrage wurde gesendet.'}</Notice>
  return (
    <form className="card narrow" onSubmit={e => { e.preventDefault(); submit.mutate() }}>
      <Field label="Name" required><input required value={values.fullName ?? ''} onChange={e => setValues({ ...values, fullName: e.target.value })} /></Field>
      <Field label="E-Mail" required><input type="email" required value={values.email ?? ''} onChange={e => setValues({ ...values, email: e.target.value })} /></Field>
      {values.subjectEnabled && <Field label="Betreff" required><input required value={values.subject ?? ''} onChange={e => setValues({ ...values, subject: e.target.value })} /></Field>}
      <AttributeInputs attributes={initial.contactFormAttributes} prefix="contact_attribute_" values={attributes} onChange={setAttributes} />
      <Field label="Anfrage" required><textarea required rows={6} value={values.enquiry ?? ''} onChange={e => setValues({ ...values, enquiry: e.target.value })} /></Field>
      {submit.data?.result && <Notice kind="warning">{submit.data.result}</Notice>}
      <ErrorMessage error={submit.error} />
      <button className="primary" disabled={submit.isPending}>Absenden</button>
    </form>
  )
}

export function ContactUsPage() {
  const form = useQuery({ queryKey: ['contact-us'], queryFn: () => api.get<ContactUsModel>('/contact-us') })
  return (
    <>
      <h1>Kontakt</h1>
      <TopicInline systemName="ContactUs" />
      <QueryView query={form}>{model => <ContactForm initial={model} send={values => api.post<ContactUsModel>('/contact-us', values)} />}</QueryView>
    </>
  )
}

export function ContactVendorPage() {
  const vendorId = Number(useParams().vendorId)
  const form = useQuery({ queryKey: ['contact-vendor', vendorId], queryFn: () => api.get<ContactVendorModel>(`/vendors/${vendorId}/contact`) })
  return (
    <QueryView query={form}>
      {model => (
        <>
          <h1>Kontakt zu {model.vendorName}</h1>
          <ContactForm initial={model} send={values => api.post<ContactVendorModel>(`/vendors/${vendorId}/contact`, values)} />
        </>
      )}
    </QueryView>
  )
}

/** Topic body without title, if it exists (e.g. the text above the contact form) */
function TopicInline({ systemName }: { systemName: string }) {
  const topic = useQuery({ queryKey: ['topic', systemName], queryFn: () => api.get<TopicModel>(`/common/topics/${systemName}`), retry: false })
  return topic.data ? <Html html={topic.data.body} /> : null
}

/* ---------- public profile ---------- */

export function ProfilePage() {
  const id = Number(useParams().id)
  const profile = useQuery({ queryKey: ['profile', id], queryFn: () => api.get<CustomerProfileModel>(`/profiles/${id}`) })
  return (
    <QueryView query={profile}>
      {p => (
        <>
          <h1>{p.profile.profileTitle}</h1>
          <div className="card row">
            <Img url={p.info.avatarUrl} className="avatar" />
            <dl className="kv">
              {p.info.locationEnabled && <><dt>Ort</dt><dd>{p.info.location}</dd></>}
              {p.info.joinDateEnabled && <><dt>Mitglied seit</dt><dd>{p.info.joinDate}</dd></>}
              {p.info.dateOfBirthEnabled && <><dt>Geburtstag</dt><dd>{p.info.dateOfBirth}</dd></>}
              {p.info.totalPostsEnabled && <><dt>Beiträge</dt><dd>{p.info.totalPosts}</dd></>}
            </dl>
          </div>
          {p.info.pmEnabled && <Link className="button" to={`/sendpm/${id}`}>Private Nachricht senden</Link>}
        </>
      )}
    </QueryView>
  )
}
