'use client'

import { createUI, monoTheme } from '@rubriclab/ui'
import { geist } from './fonts/geist'

export const { Button, Layout } = createUI({
	...monoTheme,
	components: {
		...monoTheme.components,
		button: {
			danger: {
				...monoTheme.components.button.danger,
				size: 'small'
			},
			primary: {
				...monoTheme.components.button.primary,
				size: 'small'
			},
			subtle: {
				...monoTheme.components.button.subtle,
				size: 'small'
			}
		}
	},
	fonts: {
		display: geist,
		text: geist
	}
})
