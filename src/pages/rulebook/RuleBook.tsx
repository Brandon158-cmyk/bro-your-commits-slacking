import { useNavigate } from 'react-router-dom';
import { HandDrawnCard } from '@/components/custom/hand-drawn-card';
import { HandDrawnButton } from '@/components/custom/hand-drawn-button';
import { ArrowLeft } from 'lucide-react';

const RuleBook = () => {
	const navigate = useNavigate();

	const rules = [
		'Daily Goal: Commit 3 times per day in tracked repos.',
		'Streak: Increases each day you meet the Daily Goal.',
		'Lives: Start with 3.',
		'Lose a Life: Fail the Daily Goal.',
		'Gain a Life: Commit 6+ times (Bonus Goal!). Max 5 lives.',
		'Zero Lives: Your streak count resets to 0!',
	];

	const handleBack = () => {
		navigate(-1);
	};

	return (
		<div className='min-h-screen flex flex-col items-center justify-center p-6'>
			<HandDrawnCard variant='notebook' className='max-w-xl w-full p-6'>
				<div className='flex justify-between items-center mb-6'>
					<h1 className='text-3xl md:text-4xl font-handwritten text-pencil-dark'>
						Rule Book 📖
					</h1>
					<HandDrawnButton
						variant='outline'
						size='icon'
						onClick={handleBack}
						aria-label='Go back'
					>
						<ArrowLeft className='h-5 w-5' />
					</HandDrawnButton>
				</div>

				<ul className='space-y-3 list-disc list-inside mb-6'>
					{rules.map((rule, index) => (
						<li key={index} className='text-lg'>
							{rule}
						</li>
					))}
				</ul>
				<p className='text-center text-sm text-gray-600 italic'>
					Keep these in mind to maintain your streak!
				</p>
			</HandDrawnCard>
		</div>
	);
};

export default RuleBook;
