import { createRouter, createWebHashHistory } from 'vue-router'
import ProjectHomeView from '../views/ProjectHomeView.vue'
import ProjectDetailView from '../views/ProjectDetailView.vue'
import RankView from '../views/RankView.vue'
import HistoryView from '../views/HistoryView.vue'
import PastSeasonReviewView from '../views/PastSeasonReviewView.vue'
import ShopView from '../views/ShopView.vue'

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
      title: '项目'
    }
  },
  {
    path: '/projects/:taskName',
    name: 'project-detail',
    component: ProjectDetailView,
    meta: {
      navKey: 'project',
      title: '项目详情'
    }
  },
  {
    path: '/rank',
    name: 'rank',
    component: RankView,
    meta: {
      navKey: 'rank',
      title: '排行'
    }
  },
  {
    path: '/history',
    name: 'history',
    component: HistoryView,
    meta: {
      navKey: 'history',
      title: '历史'
    }
  },
  {
    path: '/history/season-reviews',
    name: 'season-review-history',
    component: PastSeasonReviewView,
    meta: {
      navKey: 'history',
      title: '过往审核'
    }
  },
  {
    path: '/shop',
    name: 'shop',
    component: ShopView,
    meta: {
      navKey: 'shop',
      title: '商城'
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
