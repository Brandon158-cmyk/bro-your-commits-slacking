import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Lock, GitBranch } from 'lucide-react';
import { HandDrawnButton } from './hand-drawn-button';

interface RepoGuideProps {
	onToggleSettings: () => void;
}

export const RepoGuide: React.FC<RepoGuideProps> = ({ onToggleSettings }) => {
	return (
		<motion.div
			className='fixed right-0 top-1/2 transform -translate-y-1/2 z-50'
			initial={{ x: 220 }}
			animate={{ x: 0 }}
			transition={{
				type: 'spring',
				stiffness: 100,
				delay: 1,
				damping: 10,
			}}
			whileHover={{ x: -20 }}
		>
			<div className='relative'>
				{/* Character body */}
				<svg
					width='220'
					height='420'
					viewBox='0 0 220 420'
					fill='none'
					xmlns='http://www.w3.org/2000/svg'
					className='overflow-visible'
				>
					{/* Guide character with funny face */}
					<g className='character'>
						{/* Body */}
						<path
							d='M180 270c0 33.14-26.86 60-60 60s-60-26.86-60-60 26.86-60 60-60 60 26.86 60 60z'
							fill='#f9e4b7'
							stroke='#322b28'
							strokeWidth='3'
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeDasharray='0,0'
						/>

						{/* Arms */}
						<path
							d='M65 250c-20 15-40 10-45 0M156 250c30 20 50 5 55-10'
							stroke='#322b28'
							strokeWidth='3'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>

						{/* Legs */}
						<path
							d='M100 330c-10 30-15 60-15 80M140 330c10 30 15 60 15 80'
							stroke='#322b28'
							strokeWidth='3'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>

						{/* Face */}
						<circle cx='105' cy='230' r='5' fill='#322b28' />
						<circle cx='135' cy='230' r='5' fill='#322b28' />
						<path
							d='M110 250c5 10 20 10 25 0'
							stroke='#322b28'
							strokeWidth='3'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>

						{/* Hair */}
						<path
							d='M90 200c-10-20 0-40 30-40 30 0 40 20 30 40'
							stroke='#322b28'
							strokeWidth='3'
							strokeLinecap='round'
							strokeLinejoin='round'
							fill='#322b28'
						/>
					</g>

					{/* Sign on a stick */}
					<g className='sign'>
						<path
							d='M70 150h130v100H70z'
							fill='#f0e6d2'
							stroke='#322b28'
							strokeWidth='3'
							strokeDasharray='0,0'
						/>
						<path
							d='M120 250v80'
							stroke='#322b28'
							strokeWidth='3'
							strokeLinecap='round'
						/>

						{/* Sign content */}
						<text
							x='80'
							y='180'
							fontFamily='Comic Sans MS, cursive'
							fontSize='12'
							fill='#322b28'
							className='sign-text'
						>
							Psst! You can now
						</text>
						<text
							x='80'
							y='200'
							fontFamily='Comic Sans MS, cursive'
							fontSize='12'
							fill='#322b28'
							className='sign-text'
						>
							track your private
						</text>
						<text
							x='80'
							y='220'
							fontFamily='Comic Sans MS, cursive'
							fontSize='12'
							fill='#322b28'
							className='sign-text'
						>
							repos too!
						</text>
					</g>
				</svg>

				{/* Interactive button on the character */}
				<div className='absolute left-10 top-[180px] w-[150px]'>
					<HandDrawnButton
						onClick={onToggleSettings}
						className='text-ink-blue text-sm px-2 py-1 font-medium hover:bg-ink-blue hover:text-white transition-colors'
					>
						<div className='flex items-center gap-1'>
							<Settings className='h-4 w-4' />
							<Lock className='h-3 w-3' />
							<span>Manage Repos</span>
						</div>
					</HandDrawnButton>
				</div>
			</div>
		</motion.div>
	);
};
