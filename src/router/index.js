import { createRouter, createWebHashHistory } from 'vue-router'
import ProjectHomeView from '../views/ProjectHomeView.vue'
import ProjectDetailView from '../views/ProjectDetailView.vue'
import RankView from '../views/RankView.vue'
import HistoryView from '../views/HistoryView.vue'
import PastSeasonReviewView from '../views/PastSeasonReviewView.vue'
import ShopView from '../views/ShopView.vue'

// pageOrder 按底部导航从左到右排列，详情页放在所属主页面与下一主页面之间。
// App.vue 只比较该值决定滑动方向，不把浏览器前进/后退误当成固定方向。
const routes = [
  {
    path: '/',
    redirect: { name: 'projects' }
  },
  {
    path: '/projects',
    name: 'projects',
    component: ProjectHomeView,
    meta: {
      navKey: 'project',
      title: '项目',
      pageOrder: 0,
      keepAlive: true
    }
  },
  {
    path: '/projects/:taskName',
    name: 'project-detail',
    component: ProjectDetailView,
    meta: {
      navKey: 'project',
      title: '项目详情',
      pageOrder: 0.5,
      keepAlive: true
    }
  },
  {
    path: '/rank',
    name: 'rank',
    component: RankView,
    meta: {
      navKey: 'rank',
      title: '排行',
      pageOrder: 1,
      keepAlive: true
    }
  },
  {
    path: '/history',
    name: 'history',
    component: HistoryView,
    meta: {
      navKey: 'history',
      title: '历史',
      pageOrder: 2,
      keepAlive: true
    }
  },
  {
    path: '/history/season-reviews',
    name: 'season-review-history',
    component: PastSeasonReviewView,
    meta: {
      navKey: 'history',
      title: '过往审核',
      pageOrder: 2.5,
      keepAlive: true
    }
  },
  {
    path: '/shop',
    name: 'shop',
    component: ShopView,
    meta: {
      navKey: 'shop',
      title: '商城',
      pageOrder: 3,
      keepAlive: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'projects' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
